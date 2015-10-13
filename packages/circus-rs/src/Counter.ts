/**
 * Simple counter that holds how many requests happened during the server is up.
 */

interface CounterHash {
	[key: string]: number;
}

export default class Counter {
	private counter: CounterHash = {};

	public countUp(key: string) {
		if (key in this.counter) {
			this.counter[key]++;
		} else {
			this.counter[key] = 1;
		}
	}

	public getCount(key: string): number {
		return (key in this.counter) ? this.counter[key] : 0;
	}

	public getCounts(): CounterHash {
		return this.counter;
	}
}