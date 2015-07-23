export = Configuration;

interface Configuration {
	pathResolver?: {
		module?: string;
		options: any;
	};

	logs?: any[];

	port?: number;

	bufferSize?: number;

	dumper: {
		module?: string;
		options?: any;
	};

	mpr: {
		options: {
			pngWriter?: string;
			pngWriterOptions?: any;
		}
	};

	cache?: {
		memoryThreshold?: number;
	};
}
