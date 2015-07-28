interface Configuration {
	pathResolver?: {
		module?: string;
		options?: any;
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
	};

	cache?: {
		memoryThreshold?: number;
	};

	authorization?: {
		require: boolean;
		expire?: number;
	};

}
