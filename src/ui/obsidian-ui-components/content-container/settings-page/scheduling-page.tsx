import { Notice, Setting, SettingGroup } from "obsidian";

import { Algorithm } from "src/algorithms/base/isrs-algorithm";
import {
    deleteAllSchedulingData,
    deleteAllSchedulingDataInCards,
    deleteAllSchedulingDataInNotes,
} from "src/delete-scheduling-data";
import { t } from "src/lang/helpers";
import SRPlugin from "src/main";
import { DEFAULT_SETTINGS } from "src/settings";
import { SettingsPage } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page";
import { SettingsPageType } from "src/ui/obsidian-ui-components/content-container/settings-page/settings-page-manager";
import { ConfirmationModal } from "src/ui/obsidian-ui-components/modals/confirmation-modal";
import { DateUtil, globalDateProvider, IDayBoundary } from "src/utils/dates";

/**
 * Represents a scheduling settings page.
 *
 * @class SchedulingPage
 * @extends {SettingsPage}
 */
export class SchedulingPage extends SettingsPage {
    constructor(
        pageContainerEl: HTMLElement,
        plugin: SRPlugin,
        pageType: SettingsPageType,
        applySettingsUpdate: (callback: () => unknown) => void,
        display: () => void,
        openPage: (pageType: SettingsPageType) => void,
        scrollListener: (scrollPosition: number) => void,
    ) {
        super(
            pageContainerEl,
            plugin,
            pageType,
            applySettingsUpdate,
            display,
            openPage,
            scrollListener,
        );

        const isLinearAlgorithm = this.plugin.data.settings.algorithm === Algorithm.LINEAR;
        const algorithmGroup = new SettingGroup(this.containerEl).setHeading(t("ALGORITHM"));

        algorithmGroup
            .addSetting((setting: Setting) => {
                const algoSettingEl = setting
                    .setName(t("ALGORITHM"))
                    .setDesc("")
                    .addDropdown((dropdown) =>
                        dropdown
                            .addOptions({
                                [Algorithm.SM_2_OSR]: t("SM2_OSR_VARIANT"),
                                [Algorithm.LINEAR]: t("LINEAR_ALGORITHM"),
                            })
                            .setValue(this.plugin.data.settings.algorithm)
                            .onChange(async (value) => {
                                this.plugin.data.settings.algorithm = value;
                                this.plugin.setupDataStoreAndAlgorithmInstances(
                                    this.plugin.data.settings,
                                );
                                await this.plugin.savePluginData();
                                this.display();
                            }),
                    );

                algoSettingEl.descEl.insertAdjacentHTML(
                    "beforeend",
                    t("CHECK_ALGORITHM_WIKI", {
                        algoUrl: "https://stephenmwangi.com/obsidian-spaced-repetition/algorithms/",
                    }),
                );
            })
            .addSetting((setting: Setting) => {
                setting
                    .setName(t("BASE_EASE"))
                    .setDesc(t("BASE_EASE_DESC"))
                    .addExtraButton((button) => {
                        button
                            .setIcon("reset")
                            .setTooltip(t("RESET_DEFAULT"))
                            .onClick(async () => {
                                this.plugin.data.settings.baseEase = DEFAULT_SETTINGS.baseEase;
                                await this.plugin.savePluginData();

                                this.display();
                            });
                    })
                    .addText((text) =>
                        text
                            .setValue(this.plugin.data.settings.baseEase.toString())
                            .onChange((value) => {
                                applySettingsUpdate(async () => {
                                    const numValue: number = Number.parseInt(value);
                                    if (!isNaN(numValue)) {
                                        if (numValue < 130) {
                                            new Notice(t("BASE_EASE_MIN_WARNING"));
                                            text.setValue(
                                                this.plugin.data.settings.baseEase.toString(),
                                            );
                                            return;
                                        }

                                        this.plugin.data.settings.baseEase = numValue;
                                        await this.plugin.savePluginData();
                                    } else {
                                        new Notice(t("VALID_NUMBER_WARNING"));
                                    }
                                });
                            }),
                    );
            });

        if (isLinearAlgorithm) {
            algorithmGroup.addSetting((setting: Setting) => {
                setting.setName(t("LINEAR_SETTINGS")).setDesc(t("LINEAR_SETTINGS_DESC"));
            });

            algorithmGroup.addSetting((setting: Setting) => {
                setting
                    .setName(t("LINEAR_HARD_INTERVAL_FACTOR"))
                    .setDesc(t("LINEAR_HARD_INTERVAL_FACTOR_DESC"))
                    .addExtraButton((button) => {
                        button
                            .setIcon("reset")
                            .setTooltip(t("RESET_DEFAULT"))
                            .onClick(async () => {
                                this.plugin.data.settings.linearHardIntervalFactor =
                                    DEFAULT_SETTINGS.linearHardIntervalFactor;
                                await this.plugin.savePluginData();
                                this.display();
                            });
                    })
                    .addText((text) =>
                        text
                            .setValue(this.plugin.data.settings.linearHardIntervalFactor.toString())
                            .onChange((value) => {
                                applySettingsUpdate(async () => {
                                    const numValue = Number.parseFloat(value);
                                    if (isNaN(numValue) || numValue <= 0) {
                                        new Notice(t("VALID_NUMBER_WARNING"));
                                        text.setValue(
                                            this.plugin.data.settings.linearHardIntervalFactor.toString(),
                                        );
                                        return;
                                    }

                                    this.plugin.data.settings.linearHardIntervalFactor = numValue;
                                    await this.plugin.savePluginData();
                                });
                            }),
                    );
            });

            algorithmGroup.addSetting((setting: Setting) => {
                setting
                    .setName(t("LINEAR_HARD_DELAY_FACTOR"))
                    .setDesc(t("LINEAR_HARD_DELAY_FACTOR_DESC"))
                    .addExtraButton((button) => {
                        button
                            .setIcon("reset")
                            .setTooltip(t("RESET_DEFAULT"))
                            .onClick(async () => {
                                this.plugin.data.settings.linearHardDelayFactor =
                                    DEFAULT_SETTINGS.linearHardDelayFactor;
                                await this.plugin.savePluginData();
                                this.display();
                            });
                    })
                    .addText((text) =>
                        text
                            .setValue(this.plugin.data.settings.linearHardDelayFactor.toString())
                            .onChange((value) => {
                                applySettingsUpdate(async () => {
                                    const numValue = Number.parseFloat(value);
                                    if (isNaN(numValue) || numValue < 0) {
                                        new Notice(t("VALID_NUMBER_WARNING"));
                                        text.setValue(
                                            this.plugin.data.settings.linearHardDelayFactor.toString(),
                                        );
                                        return;
                                    }

                                    this.plugin.data.settings.linearHardDelayFactor = numValue;
                                    await this.plugin.savePluginData();
                                });
                            }),
                    );
            });

            algorithmGroup.addSetting((setting: Setting) => {
                setting
                    .setName(t("LINEAR_MINIMUM_HARD_INTERVAL"))
                    .setDesc(t("LINEAR_MINIMUM_HARD_INTERVAL_DESC"))
                    .addExtraButton((button) => {
                        button
                            .setIcon("reset")
                            .setTooltip(t("RESET_DEFAULT"))
                            .onClick(async () => {
                                this.plugin.data.settings.linearMinimumHardInterval =
                                    DEFAULT_SETTINGS.linearMinimumHardInterval;
                                await this.plugin.savePluginData();
                                this.display();
                            });
                    })
                    .addText((text) =>
                        text
                            .setValue(
                                this.plugin.data.settings.linearMinimumHardInterval.toString(),
                            )
                            .onChange((value) => {
                                applySettingsUpdate(async () => {
                                    const numValue = Number.parseFloat(value);
                                    if (isNaN(numValue) || numValue < 0) {
                                        new Notice(t("VALID_NUMBER_WARNING"));
                                        text.setValue(
                                            this.plugin.data.settings.linearMinimumHardInterval.toString(),
                                        );
                                        return;
                                    }

                                    this.plugin.data.settings.linearMinimumHardInterval = numValue;
                                    await this.plugin.savePluginData();
                                });
                            }),
                    );
            });

            algorithmGroup.addSetting((setting: Setting) => {
                setting
                    .setName(t("LINEAR_GOOD_MULTIPLIER"))
                    .setDesc(t("LINEAR_GOOD_MULTIPLIER_DESC"))
                    .addExtraButton((button) => {
                        button
                            .setIcon("reset")
                            .setTooltip(t("RESET_DEFAULT"))
                            .onClick(async () => {
                                this.plugin.data.settings.linearGoodMultiplier =
                                    DEFAULT_SETTINGS.linearGoodMultiplier;
                                await this.plugin.savePluginData();
                                this.display();
                            });
                    })
                    .addText((text) =>
                        text
                            .setValue(this.plugin.data.settings.linearGoodMultiplier.toString())
                            .onChange((value) => {
                                applySettingsUpdate(async () => {
                                    const numValue = Number.parseFloat(value);
                                    if (isNaN(numValue) || numValue < 1) {
                                        new Notice(t("VALID_NUMBER_WARNING"));
                                        text.setValue(
                                            this.plugin.data.settings.linearGoodMultiplier.toString(),
                                        );
                                        return;
                                    }

                                    this.plugin.data.settings.linearGoodMultiplier = numValue;
                                    await this.plugin.savePluginData();
                                });
                            }),
                    );
            });

            algorithmGroup.addSetting((setting: Setting) => {
                setting
                    .setName(t("LINEAR_EASY_MULTIPLIER"))
                    .setDesc(t("LINEAR_EASY_MULTIPLIER_DESC"))
                    .addExtraButton((button) => {
                        button
                            .setIcon("reset")
                            .setTooltip(t("RESET_DEFAULT"))
                            .onClick(async () => {
                                this.plugin.data.settings.linearEasyMultiplier =
                                    DEFAULT_SETTINGS.linearEasyMultiplier;
                                await this.plugin.savePluginData();
                                this.display();
                            });
                    })
                    .addText((text) =>
                        text
                            .setValue(this.plugin.data.settings.linearEasyMultiplier.toString())
                            .onChange((value) => {
                                applySettingsUpdate(async () => {
                                    const numValue = Number.parseFloat(value);
                                    if (isNaN(numValue) || numValue < 1) {
                                        new Notice(t("VALID_NUMBER_WARNING"));
                                        text.setValue(
                                            this.plugin.data.settings.linearEasyMultiplier.toString(),
                                        );
                                        return;
                                    }

                                    this.plugin.data.settings.linearEasyMultiplier = numValue;
                                    await this.plugin.savePluginData();
                                });
                            }),
                    );
            });
        } else {
            algorithmGroup
                .addSetting((setting: Setting) => {
                    setting
                        .setName(t("LAPSE_INTERVAL_CHANGE"))
                        .setDesc(t("LAPSE_INTERVAL_CHANGE_DESC"))
                        .addExtraButton((button) => {
                            button
                                .setIcon("reset")
                                .setTooltip(t("RESET_DEFAULT"))
                                .onClick(async () => {
                                    this.plugin.data.settings.lapsesIntervalChange =
                                        DEFAULT_SETTINGS.lapsesIntervalChange;
                                    await this.plugin.savePluginData();

                                    this.display();
                                });
                        })
                        .addSlider((slider) =>
                            slider
                                .setLimits(1, 99, 1)
                                .setValue(this.plugin.data.settings.lapsesIntervalChange * 100)
                                .setDynamicTooltip()
                                .onChange(async (value: number) => {
                                    this.plugin.data.settings.lapsesIntervalChange = value / 100;
                                    await this.plugin.savePluginData();
                                }),
                        );
                })
                .addSetting((setting: Setting) => {
                    setting
                        .setName(t("EASY_BONUS"))
                        .setDesc(t("EASY_BONUS_DESC"))
                        .addExtraButton((button) => {
                            button
                                .setIcon("reset")
                                .setTooltip(t("RESET_DEFAULT"))
                                .onClick(async () => {
                                    this.plugin.data.settings.easyBonus =
                                        DEFAULT_SETTINGS.easyBonus;
                                    await this.plugin.savePluginData();

                                    this.display();
                                });
                        })
                        .addText((text) =>
                            text
                                .setValue((this.plugin.data.settings.easyBonus * 100).toString())
                                .onChange((value) => {
                                    applySettingsUpdate(async () => {
                                        const numValue: number = Number.parseInt(value) / 100;
                                        if (!isNaN(numValue)) {
                                            if (numValue < 1.0) {
                                                new Notice(t("EASY_BONUS_MIN_WARNING"));
                                                text.setValue(
                                                    (
                                                        this.plugin.data.settings.easyBonus * 100
                                                    ).toString(),
                                                );
                                                return;
                                            }

                                            this.plugin.data.settings.easyBonus = numValue;
                                            await this.plugin.savePluginData();
                                        } else {
                                            new Notice(t("VALID_NUMBER_WARNING"));
                                        }
                                    });
                                }),
                        );
                });
        }

        algorithmGroup
            .addSetting((setting: Setting) => {
                setting
                    .setName(t("LOAD_BALANCE"))
                    .setDesc(t("LOAD_BALANCE_DESC"))
                    .addToggle((toggle) =>
                        toggle
                            .setValue(this.plugin.data.settings.loadBalance)
                            .onChange(async (value) => {
                                this.plugin.data.settings.loadBalance = value;
                                await this.plugin.savePluginData();
                            }),
                    );
            })
            .addSetting((setting: Setting) => {
                setting
                    .setName(t("MAX_INTERVAL"))
                    .setDesc(t("MAX_INTERVAL_DESC"))
                    .addExtraButton((button) => {
                        button
                            .setIcon("reset")
                            .setTooltip(t("RESET_DEFAULT"))
                            .onClick(async () => {
                                this.plugin.data.settings.maximumInterval =
                                    DEFAULT_SETTINGS.maximumInterval;
                                await this.plugin.savePluginData();

                                this.display();
                            });
                    })
                    .addText((text) =>
                        text
                            .setValue(this.plugin.data.settings.maximumInterval.toString())
                            .onChange((value) => {
                                applySettingsUpdate(async () => {
                                    const numValue: number = Number.parseInt(value);
                                    if (!isNaN(numValue)) {
                                        if (numValue < 1) {
                                            new Notice(t("MAX_INTERVAL_MIN_WARNING"));
                                            text.setValue(
                                                this.plugin.data.settings.maximumInterval.toString(),
                                            );
                                            return;
                                        }

                                        this.plugin.data.settings.maximumInterval = numValue;
                                        await this.plugin.savePluginData();
                                    } else {
                                        new Notice(t("VALID_NUMBER_WARNING"));
                                    }
                                });
                            }),
                    );
            })
            .addSetting((setting: Setting) => {
                setting
                    .setName(t("START_OF_DAY"))
                    .setDesc(t("START_OF_DAY_DESC"))
                    .addExtraButton((button) => {
                        button
                            .setIcon("reset")
                            .setTooltip(t("RESET_DEFAULT"))
                            .onClick(async () => {
                                this.plugin.data.settings.startOfDay = DEFAULT_SETTINGS.startOfDay;
                                await this.plugin.savePluginData();

                                this.display();
                            });
                    })
                    .addText((text) =>
                        text.setValue(this.plugin.data.settings.startOfDay).onChange((value) => {
                            applySettingsUpdate(async () => {
                                const dayBoundary: IDayBoundary | null =
                                    DateUtil.strToDayBoundary(value);
                                if (dayBoundary === null) {
                                    new Notice(t("INVALID_START_OF_DAY_WARNING"));
                                    return;
                                } else {
                                    this.plugin.data.settings.startOfDay = value;
                                    await this.plugin.savePluginData();
                                    globalDateProvider.setDayBoundary(dayBoundary);
                                    console.log("Day boundary set to", dayBoundary);
                                }
                            });
                        }),
                    );
            })
            .addSetting((setting: Setting) => {
                setting
                    .setName(t("MAX_LINK_CONTRIB"))
                    .setDesc(t("MAX_LINK_CONTRIB_DESC"))
                    .addExtraButton((button) => {
                        button
                            .setIcon("reset")
                            .setTooltip(t("RESET_DEFAULT"))
                            .onClick(async () => {
                                this.plugin.data.settings.maxLinkFactor =
                                    DEFAULT_SETTINGS.maxLinkFactor;
                                await this.plugin.savePluginData();

                                this.display();
                            });
                    })
                    .addSlider((slider) =>
                        slider
                            .setLimits(0, 100, 1)
                            .setValue(this.plugin.data.settings.maxLinkFactor * 100)
                            .setDynamicTooltip()
                            .onChange(async (value: number) => {
                                this.plugin.data.settings.maxLinkFactor = value / 100;
                                await this.plugin.savePluginData();
                            }),
                    );
            });

        new SettingGroup(this.containerEl)
            .setHeading(t("GROUP_DATA_STORAGE"))
            .addSetting((setting: Setting) => {
                setting
                    .setName(t("GROUP_DATA_STORAGE"))
                    .setDesc(t("GROUP_DATA_STORAGE_DESC"))
                    .addDropdown((dropdown) =>
                        dropdown
                            .addOptions({
                                NOTES: t("STORE_IN_NOTES"),
                            })
                            .setValue(this.plugin.data.settings.dataStore)
                            .onChange(async (value) => {
                                this.plugin.data.settings.dataStore = value;
                                await this.plugin.savePluginData();
                            }),
                    );
            })
            .addSetting((setting: Setting) => {
                setting
                    .setName(t("INLINE_SCHEDULING_COMMENTS"))
                    .setDesc(t("INLINE_SCHEDULING_COMMENTS_DESC"))
                    .addToggle((toggle) =>
                        toggle
                            .setValue(this.plugin.data.settings.cardCommentOnSameLine)
                            .onChange(async (value) => {
                                this.plugin.data.settings.cardCommentOnSameLine = value;
                                await this.plugin.savePluginData();
                            }),
                    );
            });
        new SettingGroup(this.containerEl)
            .setHeading(t("DELETE_SCHEDULING_DATA_ALL"))
            .addSetting((setting: Setting) => {
                setting
                    .setName(t("DELETE_SCHEDULING_DATA_ALL"))
                    .setDesc(t("DELETE_SCHEDULING_DATA_ALL_DESC"))
                    .addButton((button) => {
                        button
                            .setButtonText(t("DELETE"))
                            .setClass("mod-warning")
                            .onClick(async () => {
                                new ConfirmationModal(
                                    this.plugin.app,
                                    t("DELETE_SCHEDULING_DATA_ALL"),
                                    t("CONFIRM_SCHEDULING_DATA_ALL_DELETION"),
                                    t("SCHEDULING_DATA_ALL_DELETION_IN_PROGRESS"),
                                    deleteAllSchedulingData,
                                ).open();
                            });
                    });
            })
            .addSetting((setting: Setting) => {
                setting
                    .setName(t("DELETE_SCHEDULING_DATA_IN_NOTES"))
                    .setDesc(t("DELETE_SCHEDULING_DATA_IN_NOTES_DESC"))
                    .addButton((button) => {
                        button
                            .setButtonText(t("DELETE"))
                            .setClass("mod-warning")
                            .onClick(async () => {
                                new ConfirmationModal(
                                    this.plugin.app,
                                    t("DELETE_SCHEDULING_DATA_IN_NOTES"),
                                    t("CONFIRM_SCHEDULING_DATA_IN_NOTES_DELETION"),
                                    t("SCHEDULING_DATA_IN_NOTES_DELETION_IN_PROGRESS"),
                                    deleteAllSchedulingDataInNotes,
                                ).open();
                            });
                    });
            })
            .addSetting((setting: Setting) => {
                setting
                    .setName(t("DELETE_SCHEDULING_DATA_IN_CARDS"))
                    .setDesc(t("DELETE_SCHEDULING_DATA_IN_CARDS_DESC"))
                    .addButton((button) => {
                        button
                            .setButtonText(t("DELETE"))
                            .setClass("mod-warning")
                            .onClick(async () => {
                                new ConfirmationModal(
                                    this.plugin.app,
                                    t("DELETE_SCHEDULING_DATA_IN_CARDS"),
                                    t("CONFIRM_SCHEDULING_DATA_IN_CARDS_DELETION"),
                                    t("SCHEDULING_DATA_IN_CARDS_DELETION_IN_PROGRESS"),
                                    deleteAllSchedulingDataInCards,
                                ).open();
                            });
                    });
            });
    }
}
