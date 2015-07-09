/**
 * Simple counter that holds how many requests happened during the server is up.
 */

interface CounterHash {
	[key: string]: number;
}

export = Counter;

class Counter {
	private static counter: CounterHash = {};

	public static countUp(key: string) {
		if (key in this.counter) {
			this.counter[key]++;
		} else {
			this.counter[key] = 1;
		}
	}

	public static getCounts(): CounterHash {
		return this.counter;
	}
}