export = Configuration;

interface Configuration {
	pathResolver?: {
		module?: string;
		options: any;
	};

	logs?: any[];

	port?: number;

	dumper: {
		module?: string;
		options?: any;
	};

	rawDumper: {
		module?: string;
		options?: any;
	};

	pngWriter: {
		module?: string;
		options?: any;
	}

	mpr: {
		options?: any
	};

	cache?: {
		memoryThreshold?: number;
	};
}
