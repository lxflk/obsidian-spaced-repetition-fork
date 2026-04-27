import { Algorithm } from "src/algorithms/base/isrs-algorithm";
import { createSrsAlgorithm } from "src/algorithms/base/create-srs-algorithm";
import { ReviewResponse } from "src/algorithms/base/repetition-item";
import { SrsAlgorithmLinear } from "src/algorithms/linear/srs-algorithm-linear";
import { OsrNoteGraph } from "src/algorithms/osr/osr-note-graph";
import { RepItemScheduleInfoOsr } from "src/algorithms/osr/rep-item-schedule-info-osr";
import { DueDateHistogram } from "src/due-date-histogram";
import { Note } from "src/note/note";
import { DEFAULT_SETTINGS } from "src/settings";

const settings = {
    ...DEFAULT_SETTINGS,
    algorithm: Algorithm.LINEAR,
    loadBalance: false,
};

function createEmptyGraph(): OsrNoteGraph {
    return new OsrNoteGraph({
        getResolvedTargetLinksForNotePath: () => ({}),
    });
}

test("createSrsAlgorithm returns the linear implementation", () => {
    expect(createSrsAlgorithm(settings)).toBeInstanceOf(SrsAlgorithmLinear);
});

test("SrsAlgorithmLinear computes card schedules from the linear baseline", () => {
    const algorithm = new SrsAlgorithmLinear(settings);
    const histogram = new DueDateHistogram();

    const resetSchedule = algorithm.cardGetResetSchedule() as RepItemScheduleInfoOsr;
    expect(resetSchedule.interval).toEqual(1);
    expect(resetSchedule.latestEase).toEqual(DEFAULT_SETTINGS.baseEase);

    const newSchedule = algorithm.cardGetNewSchedule(
        ReviewResponse.Good,
        "Linear.md",
        histogram,
    ) as RepItemScheduleInfoOsr;
    expect(newSchedule.interval).toEqual(2);
    expect(newSchedule.latestEase).toEqual(DEFAULT_SETTINGS.baseEase);

    const updatedSchedule = algorithm.cardCalcUpdatedSchedule(
        ReviewResponse.Easy,
        new RepItemScheduleInfoOsr(null, 10, DEFAULT_SETTINGS.baseEase, 2 * 24 * 3600 * 1000),
        histogram,
    ) as RepItemScheduleInfoOsr;
    expect(updatedSchedule.interval).toEqual(21);
    expect(updatedSchedule.latestEase).toEqual(DEFAULT_SETTINGS.baseEase + 20);
});

test("SrsAlgorithmLinear updates note stats and note schedules", async () => {
    const algorithm = new SrsAlgorithmLinear(settings);
    const histogram = new DueDateHistogram();
    const note = {
        questionList: [
            {
                cards: [
                    {
                        hasSchedule: true,
                        scheduleInfo: {
                            latestEase: 270,
                        },
                    },
                ],
            },
        ],
    } as Note;
    const notePath = "Linear.md";

    algorithm.noteOnLoadedNote(notePath, note, null);
    expect(algorithm.noteStats().getEaseByPath(notePath)).toEqual(252);

    const newNoteSchedule = algorithm.noteCalcNewSchedule(
        notePath,
        createEmptyGraph(),
        ReviewResponse.Good,
        histogram,
    ) as RepItemScheduleInfoOsr;
    expect(newNoteSchedule.interval).toEqual(2);
    expect(newNoteSchedule.latestEase).toEqual(251);

    const updatedNoteSchedule = algorithm.noteCalcUpdatedSchedule(
        notePath,
        new RepItemScheduleInfoOsr(null, 6, 260, 4 * 24 * 3600 * 1000),
        ReviewResponse.Hard,
        histogram,
    ) as RepItemScheduleInfoOsr;
    expect(updatedNoteSchedule.interval).toEqual(4);
    expect(updatedNoteSchedule.latestEase).toEqual(240);
    expect(algorithm.noteStats().getEaseByPath(notePath)).toEqual(240);
});
