import MultiRange, { Initializer } from 'multi-integer-range';

interface Entry {
  priority: number;
  value: MultiRange;
}

/**
 * PriorityIntegerQueue is an integer queue which enables
 * more efficient loading storategy. It's backed by MultiIntegerRange.
 */
export default class PriorityIntegerQueue {
  // Hold entries in the ASCENDING order of priority
  private entries: Entry[];

  constructor() {
    this.entries = [];
  }

  public append(value: Initializer, priority: number = 0): void {
    let index = this.entries.findIndex(e => e.priority >= priority);
    if (index === -1) index = this.entries.length;
    const newRange = new MultiRange(value);

    // Remove values that are already in queue with higher priority
    for (let i = index; i < this.entries.length; i++) {
      newRange.subtract(this.entries[i].value);
    }
    if (!newRange.segmentLength()) return;

    // Remove values from entries with lower priority
    for (let i = 0; i < index; i++) {
      this.entries[i].value.subtract(newRange);
    }

    const newEntry = { priority, value: newRange };
    this.entries.splice(index, 0, newEntry);
    // console.log(
    //   this.entries.map(e => e.priority + ' ' + e.value).join('\n'),
    //   '\n'
    // );
  }

  public shift(): number | undefined {
    if (!this.entries.length) return undefined;
    const top = this.entries[this.entries.length - 1];
    const result = top.value.shift();
    if (!top.value.segmentLength()) {
      this.entries.pop();
    }
    return result;
  }

  public clear(): void {
    this.entries = [];
  }
}
