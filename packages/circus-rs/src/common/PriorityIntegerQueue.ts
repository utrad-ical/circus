import * as mr from 'multi-integer-range';
import { type RangeInput, toRange } from './rangeInput.ts';

interface Entry {
  priority: number;
  // We keep track of MultiRanges to hold the append order in the same priority
  fragments: mr.MIR[];
}

export interface PriorityIntegerQueueOptions {
  lifoForSamePriority?: boolean;
}

/**
 * PriorityIntegerQueue is an integer queue which enables
 * more efficient loading storategy. It's backed by MultiIntegerRange.
 */
export default class PriorityIntegerQueue {
  // Entries are held in the ASCENDING order of priority
  private entries: Entry[];
  private lifoForSamePriority: boolean;

  constructor(options: PriorityIntegerQueueOptions = {}) {
    const { lifoForSamePriority = false } = options;
    this.entries = [];
    this.lifoForSamePriority = !!lifoForSamePriority;
  }

  private cleanup(): void {
    this.entries.forEach(
      e => (e.fragments = e.fragments.filter(f => f.length > 0))
    );
    this.entries = this.entries.filter(e => e.fragments.length > 0);
  }

  public append(value: RangeInput, priority: number = 0): void {
    const [index, entry] = ((): [number, Entry] => {
      const i = this.entries.findIndex(e => e.priority >= priority);
      if (this.entries[i]?.priority === priority) return [i, this.entries[i]];
      const newIndex = i === -1 ? this.entries.length : i;
      const newEntry = { priority, fragments: [] };
      this.entries.splice(newIndex, 0, newEntry);
      return [newIndex, newEntry];
    })();

    let newRange = toRange(value);

    // Remove values that are already in queue with higher priority
    for (let i = index + 1; i < this.entries.length; i++) {
      for (const f of this.entries[i].fragments)
        newRange = mr.subtract(newRange, f);
    }
    if (!newRange.length) {
      this.cleanup();
      return;
    }

    // Remove values from entries with lower priority
    for (let i = 0; i < index; i++) {
      const e = this.entries[i];
      e.fragments = e.fragments.map(f => mr.subtract(f, newRange));
    }

    // In fragments in the same priority...
    if (this.lifoForSamePriority) {
      entry.fragments = entry.fragments.map(f => mr.subtract(f, newRange));
      entry.fragments.push(newRange);
    } else {
      for (const f of entry.fragments) newRange = mr.subtract(newRange, f);
      entry.fragments.unshift(newRange);
    }

    this.cleanup();
  }

  public shift(): { value: number | undefined; priority: number | undefined } {
    if (!this.entries.length) return { value: undefined, priority: undefined };
    const top = this.entries[this.entries.length - 1];
    const priority = top.priority;
    const topIndex = top.fragments.length - 1;
    const topFragment = top.fragments[topIndex];
    const result = mr.min(topFragment);
    const rest = mr.tail(topFragment);
    if (rest.length === 0) top.fragments.pop();
    else top.fragments[topIndex] = rest;
    if (top.fragments.length === 0) {
      this.entries.pop();
    }
    return { value: result, priority: priority };
  }

  public clear(): void {
    this.entries = [];
  }

  public toArray(): number[] {
    return this.entries.reduce<number[]>(
      (collection, { fragments }) => [
        ...collection,
        ...fragments.map(f => mr.flatten(f)).flat()
      ],
      []
    );
  }

  public toString(): string {
    return this.entries
      .map(
        e =>
          `p=${e.priority}: ` + e.fragments.map(f => mr.stringify(f)).join('|')
      )
      .join(' / ');
  }
}
