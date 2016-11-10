export interface ModuleDefinition {
	module?: string;
	options?: any;
}

export interface Configuration {
	logs?: any[];

	port?: number;

	dicomFileRepository?: ModuleDefinition;

	dumper?: ModuleDefinition;

	imageEncoder?: ModuleDefinition;

	cache?: {
		memoryThreshold?: number;
	};

	authorization?: {
		require: boolean;
		expire?: number;
		allowFrom?: string;
	};

}
