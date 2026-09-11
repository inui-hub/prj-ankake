import {
  projectDeckBuildingViewModel,
  type DeckBuildingViewModel,
  type ProjectDeckBuildingInput
} from "@ankake/domain";

export interface CardProjectionService {
  project(input: ProjectDeckBuildingInput): Promise<DeckBuildingViewModel>;
  projectNow(input: ProjectDeckBuildingInput): DeckBuildingViewModel;
}

export function createCardProjectionService(): CardProjectionService {
  return {
    async project(input) {
      return projectDeckBuildingViewModel(input);
    },
    projectNow(input) {
      return projectDeckBuildingViewModel(input);
    }
  };
}
