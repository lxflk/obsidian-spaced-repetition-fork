import { Algorithm, ISrsAlgorithm } from "src/algorithms/base/isrs-algorithm";
import { SrsAlgorithmLinear } from "src/algorithms/linear/srs-algorithm-linear";
import { SrsAlgorithmOsr } from "src/algorithms/osr/srs-algorithm-osr";
import { SRSettings } from "src/settings";

export function createSrsAlgorithm(settings: SRSettings): ISrsAlgorithm {
    switch (settings.algorithm) {
        case Algorithm.LINEAR:
            return new SrsAlgorithmLinear(settings);
        case Algorithm.SM_2_OSR:
        default:
            return new SrsAlgorithmOsr(settings);
    }
}
