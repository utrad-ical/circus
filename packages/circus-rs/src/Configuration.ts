interface ObjectDefinition {
	module?: string;
	options?: any;
}

interface Configuration {
	logs?: any[];

	port?: number;

	pathResolver?: ObjectDefinition;

	dumper?: ObjectDefinition;

	rawDumper?: ObjectDefinition;

	pngWriter?: ObjectDefinition;

	cache?: {
		memoryThreshold?: number;
	};

	authorization?: {
		require: boolean;
		expire?: number;
		allowFrom?: string;
	};

}
