import { ReviewResponse } from "src/algorithms/base/repetition-item";
import { linearSchedule } from "src/algorithms/linear/linear-scheduling";
import { DueDateHistogram } from "src/due-date-histogram";
import { Algorithm } from "src/algorithms/base/isrs-algorithm";
import { DEFAULT_SETTINGS } from "src/settings";

const emptyHistogram = new DueDateHistogram();

test("Linear scheduling scales from hard baseline by default multipliers", () => {
    const settings = {
        ...DEFAULT_SETTINGS,
        algorithm: Algorithm.LINEAR,
        loadBalance: false,
    };

    expect(
        linearSchedule(
            ReviewResponse.Hard,
            10,
            DEFAULT_SETTINGS.baseEase,
            2 * 24 * 3600 * 1000,
            settings,
            emptyHistogram,
        ),
    ).toEqual({
        ease: DEFAULT_SETTINGS.baseEase - 20,
        interval: 5.3,
    });

    expect(
        linearSchedule(
            ReviewResponse.Good,
            10,
            DEFAULT_SETTINGS.baseEase,
            2 * 24 * 3600 * 1000,
            settings,
            emptyHistogram,
        ),
    ).toEqual({
        ease: DEFAULT_SETTINGS.baseEase,
        interval: 10.5,
    });

    expect(
        linearSchedule(
            ReviewResponse.Easy,
            10,
            DEFAULT_SETTINGS.baseEase,
            2 * 24 * 3600 * 1000,
            settings,
            emptyHistogram,
        ),
    ).toEqual({
        ease: DEFAULT_SETTINGS.baseEase + 20,
        interval: 21,
    });
});

test("Linear scheduling respects configurable baseline controls", () => {
    const settings = {
        ...DEFAULT_SETTINGS,
        algorithm: Algorithm.LINEAR,
        loadBalance: false,
        linearHardIntervalFactor: 0.4,
        linearHardDelayFactor: 0.5,
        linearMinimumHardInterval: 3,
        linearGoodMultiplier: 3,
        linearEasyMultiplier: 1.5,
    };

    expect(
        linearSchedule(
            ReviewResponse.Hard,
            4,
            DEFAULT_SETTINGS.baseEase,
            4 * 24 * 3600 * 1000,
            settings,
            emptyHistogram,
        ),
    ).toEqual({
        ease: DEFAULT_SETTINGS.baseEase - 20,
        interval: 3,
    });

    expect(
        linearSchedule(
            ReviewResponse.Good,
            4,
            DEFAULT_SETTINGS.baseEase,
            4 * 24 * 3600 * 1000,
            settings,
            emptyHistogram,
        ),
    ).toEqual({
        ease: DEFAULT_SETTINGS.baseEase,
        interval: 9,
    });

    expect(
        linearSchedule(
            ReviewResponse.Easy,
            4,
            DEFAULT_SETTINGS.baseEase,
            4 * 24 * 3600 * 1000,
            settings,
            emptyHistogram,
        ),
    ).toEqual({
        ease: DEFAULT_SETTINGS.baseEase + 20,
        interval: 13.5,
    });
});
