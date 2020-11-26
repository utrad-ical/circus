import {
  MultiRange,
  Initializer as MultiRangeInitializer
} from 'multi-integer-range';
import PriorityIntegerQueue from './PriorityIntegerQueue';

type InvokedFunction = (integer: number) => Promise<any>;
type Callback = {
  range: MultiRange;
  resolve: Function;
  reject: Function;
};
type Options = {
  initialResolved?: MultiRangeInitializer;
  maxConcurrency?: number;
};

/**
 * Asynchronously invokes the specified callback function
 * for each integer specified via append().
 * The callback is invoked only once for each integer.
 * This class is backed by PriorityIntegerQueue.
 */
export default class PriorityIntegerCaller {
  private fn: InvokedFunction;
  private queue: PriorityIntegerQueue;
  private inOperation: boolean;
  private processing: number[];
  private maxConcurrency: number;
  public readonly resolvedRange: MultiRange;
  public readonly rejectedRange: MultiRange;

  private callbacks: Callback[];

  constructor(fn: InvokedFunction, options: Options = {}) {
    const { initialResolved, maxConcurrency = 1 } = options;
    this.fn = fn;
    this.resolvedRange = new MultiRange();
    this.rejectedRange = new MultiRange();
    this.queue = new PriorityIntegerQueue();
    this.inOperation = false;
    this.processing = [];
    this.callbacks = [];
    this.maxConcurrency = maxConcurrency;
    if (initialResolved) this.resolvedRange.append(initialResolved);
  }

  public append(target: MultiRangeInitializer, priority: number = 0): void {
    const range = new MultiRange(target)
      .subtract(this.resolvedRange)
      .subtract(this.rejectedRange)
      .subtract(this.processing || []);

    if (0 < range.segmentLength()) {
      this.queue.append(range, priority);
      if (!this.inOperation) {
        this.inOperation = true;
        this.next();
      }
    }
  }

  public waitFor(target: MultiRangeInitializer): Promise<void> {
    return new Promise((resolve, reject) => {
      this.callbacks.push({
        range: new MultiRange(target),
        resolve,
        reject
      });
      if (!this.inOperation) this.processCallbacks();
    });
  }

  private markAsResolved(range: MultiRangeInitializer): void {
    this.resolvedRange.append(range);
    this.processCallbacks();
  }

  private markAsRejected(integer: number, err: Error): void {
    this.rejectedRange.append(integer);
    this.processCallbacks();
  }

  private processCallbacks(): void {
    const remainings: Callback[] = [];
    const settledRange = this.resolvedRange.clone().append(this.rejectedRange);
    this.callbacks.forEach(waiting => {
      if (this.resolvedRange.has(waiting.range)) {
        waiting.resolve();
      } else if (settledRange.has(waiting.range)) {
        const errorRange = waiting.range.clone().intersect(this.rejectedRange);
        const message = `Rejected with ${errorRange.toString()}`;
        waiting.reject(new Error(message));
      } else {
        remainings.push(waiting);
      }
    });
    this.callbacks = remainings;
  }

  private async next(): Promise<void> {
    while (this.processing.length < this.maxConcurrency) {
      const target = this.queue.shift();
      if (target === undefined) {
        if (this.processing.length === 0) {
          this.inOperation = false;
        }
        break;
      } else {
        this.processing.push(target);
        try {
          await this.fn.call(null, target);
          this.markAsResolved(target);
        } catch (err) {
          this.markAsRejected(target, err);
        }
        this.processing.splice(this.processing.indexOf(target), 1);
        this.next();
      }
    }
  }
}
