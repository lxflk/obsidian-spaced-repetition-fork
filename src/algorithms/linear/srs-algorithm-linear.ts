import moment, { Moment } from "moment";

import { ISrsAlgorithm } from "src/algorithms/base/isrs-algorithm";
import { RepItemScheduleInfo } from "src/algorithms/base/rep-item-schedule-info";
import { ReviewResponse } from "src/algorithms/base/repetition-item";
import { linearSchedule } from "src/algorithms/linear/linear-scheduling";
import { NoteLinkStat, OsrNoteGraph } from "src/algorithms/osr/osr-note-graph";
import { RepItemScheduleInfoOsr } from "src/algorithms/osr/rep-item-schedule-info-osr";
import { Question } from "src/card/questions/question";
import { DueDateHistogram } from "src/due-date-histogram";
import { Note } from "src/note/note";
import { INoteEaseList, NoteEaseList } from "src/note/note-ease-list";
import { SRSettings } from "src/settings";
import { globalDateProvider } from "src/utils/dates";

export class SrsAlgorithmLinear implements ISrsAlgorithm {
    private settings: SRSettings;
    private noteEaseList: INoteEaseList;

    constructor(settings: SRSettings) {
        this.settings = settings;
        this.noteEaseList = new NoteEaseList(settings);
    }

    static get initialInterval(): number {
        return 1.0;
    }

    noteCalcNewSchedule(
        notePath: string,
        osrNoteGraph: OsrNoteGraph,
        response: ReviewResponse,
        dueDateNoteHistogram: DueDateHistogram,
    ): RepItemScheduleInfo {
        const noteLinkStat: NoteLinkStat = osrNoteGraph.calcNoteLinkStat(
            notePath,
            this.noteEaseList,
        );

        const linkContribution: number =
            this.settings.maxLinkFactor *
            Math.min(1.0, Math.log(noteLinkStat.totalLinkCount + 0.5) / Math.log(64));
        let ease: number =
            (1.0 - linkContribution) * this.settings.baseEase +
            (noteLinkStat.totalLinkCount > 0
                ? (linkContribution * noteLinkStat.linkTotal) / noteLinkStat.linkPGTotal
                : linkContribution * this.settings.baseEase);

        if (this.noteEaseList.hasEaseForPath(notePath)) {
            ease = (ease + this.noteEaseList.getEaseByPath(notePath)) / 2;
        }

        const dueDate: Moment = null;
        const interval: number = SrsAlgorithmLinear.initialInterval;
        ease = Math.round(ease);
        const temp = new RepItemScheduleInfoOsr(dueDate, interval, ease);
        const result = this.calcSchedule(temp, response, dueDateNoteHistogram);

        result.dueDate = moment(globalDateProvider.today.add(result.interval, "d"));
        return result;
    }

    noteOnLoadedNote(path: string, note: Note, noteEase: number): void {
        let flashcardsInNoteAvgEase: number = null;
        if (note) {
            flashcardsInNoteAvgEase = SrsAlgorithmLinear.calculateFlashcardAvgEase(
                note.questionList,
                this.settings,
            );
        }

        let ease: number;
        if (flashcardsInNoteAvgEase && noteEase) {
            ease = (flashcardsInNoteAvgEase + noteEase) / 2;
        } else {
            ease = flashcardsInNoteAvgEase ? flashcardsInNoteAvgEase : noteEase;
        }

        if (ease) {
            this.noteEaseList.setEaseForPath(path, ease);
        }
    }

    static calculateFlashcardAvgEase(questionList: Question[], settings: SRSettings): number {
        let totalEase = 0;
        let scheduledCount = 0;

        questionList.forEach((question) => {
            question.cards
                .filter((card) => card.hasSchedule)
                .forEach((card) => {
                    totalEase += card.scheduleInfo.latestEase;
                    scheduledCount++;
                });
        });

        let result = 0;
        if (scheduledCount > 0) {
            const flashcardsInNoteAvgEase = totalEase / scheduledCount;
            const flashcardContribution = Math.min(
                1.0,
                Math.log(scheduledCount + 0.5) / Math.log(64),
            );
            result =
                flashcardsInNoteAvgEase * flashcardContribution +
                settings.baseEase * (1.0 - flashcardContribution);
        }
        return result;
    }

    noteCalcUpdatedSchedule(
        notePath: string,
        noteSchedule: RepItemScheduleInfo,
        response: ReviewResponse,
        dueDateNoteHistogram: DueDateHistogram,
    ): RepItemScheduleInfo {
        const noteScheduleOsr = noteSchedule as RepItemScheduleInfoOsr;
        const temp = this.calcSchedule(noteScheduleOsr, response, dueDateNoteHistogram);
        const dueDate = moment(globalDateProvider.today.add(temp.interval, "d"));
        this.noteEaseList.setEaseForPath(notePath, temp.latestEase);
        return new RepItemScheduleInfoOsr(dueDate, temp.interval, temp.latestEase);
    }

    private calcSchedule(
        schedule: RepItemScheduleInfoOsr,
        response: ReviewResponse,
        dueDateHistogram: DueDateHistogram,
    ): RepItemScheduleInfoOsr {
        const temp = linearSchedule(
            response,
            schedule.interval,
            schedule.latestEase,
            schedule.delayedBeforeReviewTicks,
            this.settings,
            dueDateHistogram,
        );

        return new RepItemScheduleInfoOsr(globalDateProvider.today, temp.interval, temp.ease);
    }

    cardGetResetSchedule(): RepItemScheduleInfo {
        return new RepItemScheduleInfoOsr(
            globalDateProvider.today,
            SrsAlgorithmLinear.initialInterval,
            this.settings.baseEase,
        );
    }

    cardGetNewSchedule(
        response: ReviewResponse,
        notePath: string,
        dueDateFlashcardHistogram: DueDateHistogram,
    ): RepItemScheduleInfo {
        let initialEase = this.settings.baseEase;
        if (this.noteEaseList.hasEaseForPath(notePath)) {
            initialEase = Math.round(this.noteEaseList.getEaseByPath(notePath));
        }

        const schedObj = linearSchedule(
            response,
            SrsAlgorithmLinear.initialInterval,
            initialEase,
            0,
            this.settings,
            dueDateFlashcardHistogram,
        );

        return new RepItemScheduleInfoOsr(
            globalDateProvider.today.add(schedObj.interval, "d"),
            schedObj.interval,
            schedObj.ease,
            0,
        );
    }

    cardCalcUpdatedSchedule(
        response: ReviewResponse,
        cardSchedule: RepItemScheduleInfo,
        dueDateFlashcardHistogram: DueDateHistogram,
    ): RepItemScheduleInfo {
        const cardScheduleOsr = cardSchedule as RepItemScheduleInfoOsr;
        const schedObj = linearSchedule(
            response,
            cardScheduleOsr.interval,
            cardSchedule.latestEase,
            cardSchedule.delayedBeforeReviewTicks,
            this.settings,
            dueDateFlashcardHistogram,
        );

        return new RepItemScheduleInfoOsr(
            globalDateProvider.today.add(schedObj.interval, "d"),
            schedObj.interval,
            schedObj.ease,
            0,
        );
    }

    noteStats() {
        return this.noteEaseList;
    }
}
