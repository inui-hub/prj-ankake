import { generateLegalActions } from "@ankake/domain";
import { projectCpuVisibleState, type CpuVisibleState } from "@ankake/cpu";
import fc from "fast-check";
import { battleStateArbitrary } from "./battleGenerators";

export const cpuVisibleStateArbitrary: fc.Arbitrary<CpuVisibleState> = battleStateArbitrary.map((state) =>
  projectCpuVisibleState(state, generateLegalActions(state, "cpu"))
);
