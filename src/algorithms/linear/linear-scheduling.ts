import { ReviewResponse } from "src/algorithms/base/repetition-item";
import { TICKS_PER_DAY } from "src/constants";
import { DueDateHistogram } from "src/due-date-histogram";
import { t } from "src/lang/helpers";
import { SRSettings } from "src/settings";

export function linearSchedule(
    response: ReviewResponse,
    originalInterval: number,
    ease: number,
    delayedBeforeReview: number,
    settings: SRSettings,
    dueDateHistogram?: DueDateHistogram,
): Record<string, number> {
    const delayedBeforeReviewDays = Math.max(0, Math.floor(delayedBeforeReview / TICKS_PER_DAY));
    const interval = Math.max(1, originalInterval);

    const hardBaseline = Math.max(
        settings.linearMinimumHardInterval,
        (interval + delayedBeforeReviewDays * settings.linearHardDelayFactor) *
            settings.linearHardIntervalFactor,
    );

    let nextInterval = hardBaseline;
    let nextEase = ease;

    if (response === ReviewResponse.Easy) {
        nextEase += 20;
        nextInterval *= settings.linearGoodMultiplier * settings.linearEasyMultiplier;
    } else if (response === ReviewResponse.Good) {
        nextInterval *= settings.linearGoodMultiplier;
    } else if (response === ReviewResponse.Hard) {
        nextEase = Math.max(130, ease - 20);
    } else if (response === ReviewResponse.Again) {
        nextEase = Math.max(130, ease - 20);
        nextInterval = 0;
    }

    if (settings.loadBalance && dueDateHistogram !== undefined) {
        nextInterval = Math.round(nextInterval);
        if (nextInterval > 7) {
            let fuzz: number;
            if (nextInterval <= 21) fuzz = 1;
            else if (nextInterval <= 180) fuzz = Math.min(3, Math.floor(nextInterval * 0.05));
            else fuzz = Math.min(7, Math.floor(nextInterval * 0.025));

            nextInterval = dueDateHistogram.findLeastUsedIntervalOverRange(nextInterval, fuzz);
        }
    }

    nextInterval = Math.min(nextInterval, settings.maximumInterval);
    nextInterval = Math.round(nextInterval * 10) / 10;

    return { interval: nextInterval, ease: nextEase };
}

export function textInterval(interval: number, isMobile: boolean): string {
    if (interval === undefined) {
        return t("NEW");
    }

    const m: number = Math.round(interval / 3.04375) / 10,
        y: number = Math.round(interval / 36.525) / 10;

    if (isMobile) {
        if (m < 1.0) return t("DAYS_STR_IVL_MOBILE", { interval });
        else if (y < 1.0) return t("MONTHS_STR_IVL_MOBILE", { interval: m });
        else return t("YEARS_STR_IVL_MOBILE", { interval: y });
    } else {
        if (m < 1.0) return t("DAYS_STR_IVL", { interval });
        else if (y < 1.0) return t("MONTHS_STR_IVL", { interval: m });
        else return t("YEARS_STR_IVL", { interval: y });
    }
}
