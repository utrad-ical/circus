import MultiRange, {
  Initializer as MultiRangeInitializer
} from 'multi-integer-range';

interface Entry {
  priority: number;
  // We keep track of MultiRanges to hold the append order in the same priority
  fragments: MultiRange[];
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
      e => (e.fragments = e.fragments.filter(f => f.segmentLength() > 0))
    );
    this.entries = this.entries.filter(e => e.fragments.length > 0);
  }

  public append(value: MultiRangeInitializer, priority: number = 0): void {
    const [index, entry] = ((): [number, Entry] => {
      const i = this.entries.findIndex(e => e.priority >= priority);
      if (this.entries[i]?.priority === priority) return [i, this.entries[i]];
      const newIndex = i === -1 ? this.entries.length : i;
      const newEntry = { priority, fragments: [] };
      this.entries.splice(newIndex, 0, newEntry);
      return [newIndex, newEntry];
    })();

    const newRange = new MultiRange(value);

    // Remove values that are already in queue with higher priority
    for (let i = index + 1; i < this.entries.length; i++) {
      this.entries[i].fragments.forEach(f => newRange.subtract(f));
    }
    if (!newRange.segmentLength()) {
      this.cleanup();
      return;
    }

    // Remove values from entries with lower priority
    for (let i = 0; i < index; i++) {
      this.entries[i].fragments.forEach(f => f.subtract(newRange));
    }

    // In fragments in the same priority...
    if (this.lifoForSamePriority) {
      entry.fragments.forEach(f => f.subtract(newRange));
      entry.fragments.push(newRange);
    } else {
      entry.fragments.forEach(f => newRange.subtract(f));
      entry.fragments.unshift(newRange);
    }

    this.cleanup();
  }

  public shift(): number | undefined {
    if (!this.entries.length) return undefined;
    const top = this.entries[this.entries.length - 1];
    const topFragment = top.fragments[top.fragments.length - 1];
    const result = topFragment.shift();
    if (topFragment.segmentLength() === 0) top.fragments.pop();
    if (top.fragments.length === 0) {
      this.entries.pop();
    }
    return result;
  }

  public clear(): void {
    this.entries = [];
  }

  public toArray(): number[] {
    return this.entries.reduce<number[]>(
      (collection, { fragments }) => [
        ...collection,
        ...fragments.map(f => f.toArray()).flat()
      ],
      []
    );
  }

  public toString(): string {
    return this.entries
      .map(
        e => `p=${e.priority}: ` + e.fragments.map(f => f.toString()).join('|')
      )
      .join(' / ');
  }
}
