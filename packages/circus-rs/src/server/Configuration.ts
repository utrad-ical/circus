interface ObjectDefinition {
	module?: string;
	options?: any;
}

interface Configuration {
	logs?: any[];

	port?: number;

	dicomFileRepository?: ObjectDefinition;

	dumper?: ObjectDefinition;

	imageEncoder?: ObjectDefinition;

	cache?: {
		memoryThreshold?: number;
	};

	authorization?: {
		require: boolean;
		expire?: number;
		allowFrom?: string;
	};

}
