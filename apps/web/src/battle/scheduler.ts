export type SchedulerYield = () => Promise<void>;

export const yieldToBrowser: SchedulerYield = () =>
  new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
