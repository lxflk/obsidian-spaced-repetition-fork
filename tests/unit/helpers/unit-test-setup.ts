import { createSrsAlgorithm } from "src/algorithms/base/create-srs-algorithm";
import { SrsAlgorithm } from "src/algorithms/base/srs-algorithm";
import { DataStoreAlgorithm } from "src/data-store-algorithm/data-store-algorithm";
import { DataStoreInNoteAlgorithmOsr } from "src/data-store-algorithm/data-store-in-note-algorithm-osr";
import { DataStore } from "src/data-stores/base/data-store";
import { StoreInNotes } from "src/data-stores/notes/notes";
import { SRSettings } from "src/settings";

export function unitTestSetupStandardDataStoreAlgorithm(settings: SRSettings) {
    DataStore.instance = new StoreInNotes(settings);
    SrsAlgorithm.instance = createSrsAlgorithm(settings);
    DataStoreAlgorithm.instance = new DataStoreInNoteAlgorithmOsr(settings);
}
