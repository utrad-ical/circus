import { sleep } from '@utrad-ical/circus-lib';

export interface CancellableTimer {
  isActive: () => boolean;
  cancel: () => void;
  waitForNext: () => Promise<void>;
}

/**
 * A rough equivalent of promisified `setTimeout`, but with a cancel capability.
 * @param options `interval` defines the timer interval in ms.
 */
const createCancellableTimer: (
  interval: number,
  options?: {
    timerResolution?: number;
  }
) => CancellableTimer = (interval, options = {}) => {
  const { timerResolution = 100 } = options;

  let cancelled: boolean = false;

  const isActive = () => !cancelled;

  const cancel = () => {
    cancelled = true;
  };

  const waitForNext = async () => {
    const start = Date.now();
    while (start + interval > Date.now() && !cancelled) {
      await sleep(timerResolution);
    }
  };

  return {
    isActive,
    waitForNext,
    cancel
  };
};

export default createCancellableTimer;
