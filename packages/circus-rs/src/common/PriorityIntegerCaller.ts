import * as mr from 'multi-integer-range';
import PriorityIntegerQueue from './PriorityIntegerQueue.ts';
import { type RangeInput, toRange } from './rangeInput.ts';

type InvokedFunction = (integer: number) => Promise<any>;
type Callback = {
  range: mr.MIR;
  resolve: Function;
  reject: Function;
};
type Options = {
  initialResolved?: RangeInput;
  maxConcurrency?: number;
};

/**
 * Asynchronously invokes the specified callback function
 * for each integer specified via append().
 * The callback is invoked only once for each integer.
 * You can increase the number of parallel execution
 * using the `maxConcurrency` option. The default is `maxConcurrency = 1`,
 * which means callbacks are called one by one.
 *
 * This class is backed by PriorityIntegerQueue.
 */
export default class PriorityIntegerCaller {
  private fn: InvokedFunction;
  private queue: PriorityIntegerQueue;
  private inOperation: boolean;
  private processing: number[];
  private maxConcurrency: number;
  private resolved: mr.MIR = [];
  private rejected: mr.MIR = [];

  private callbacks: Callback[];

  constructor(fn: InvokedFunction, options: Options = {}) {
    const { initialResolved, maxConcurrency = 1 } = options;
    this.fn = fn;
    this.queue = new PriorityIntegerQueue();
    this.inOperation = false;
    this.processing = [];
    this.callbacks = [];
    this.maxConcurrency = maxConcurrency;
    if (initialResolved) this.resolved = toRange(initialResolved);
  }

  /**
   * Integers for which the function has been successfully called.
   */
  public get resolvedRange(): mr.MIR {
    return this.resolved;
  }

  /**
   * Integers for which the function has thrown an error.
   */
  public get rejectedRange(): mr.MIR {
    return this.rejected;
  }

  public append(target: RangeInput, priority: number = 0): void {
    let range = toRange(target);
    range = mr.subtract(range, this.resolved);
    range = mr.subtract(range, this.rejected);
    range = mr.subtract(range, mr.normalize(this.processing));

    if (0 < range.length) {
      this.queue.append(range, priority);
      if (!this.inOperation) {
        this.inOperation = true;
        this.next();
      }
    }
  }

  public waitFor(target: RangeInput): Promise<void> {
    return new Promise((resolve, reject) => {
      this.callbacks.push({
        range: toRange(target),
        resolve,
        reject
      });
      if (!this.inOperation) this.processCallbacks();
    });
  }

  private markAsResolved(integer: number): void {
    this.resolved = mr.append(this.resolved, mr.normalize(integer));
    this.processCallbacks();
  }

  private markAsRejected(integer: number, err: Error): void {
    this.rejected = mr.append(this.rejected, mr.normalize(integer));
    this.processCallbacks();
  }

  private processCallbacks(): void {
    const remainings: Callback[] = [];
    const settledRange = mr.append(this.resolved, this.rejected);
    this.callbacks.forEach(waiting => {
      if (mr.has(this.resolved, waiting.range)) {
        waiting.resolve();
      } else if (mr.has(settledRange, waiting.range)) {
        const errorRange = mr.intersect(waiting.range, this.rejected);
        const message = `Rejected with ${mr.stringify(errorRange)}`;
        waiting.reject(new Error(message));
      } else {
        remainings.push(waiting);
      }
    });
    this.callbacks = remainings;
  }

  private async next(): Promise<void> {
    while (this.processing.length < this.maxConcurrency) {
      const { value: target } = this.queue.shift();
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
        } catch (err: any) {
          this.markAsRejected(target, err);
        }
        this.processing.splice(this.processing.indexOf(target), 1);
        this.next();
      }
    }
  }
}
