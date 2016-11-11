export interface ModuleDefinition {
	module?: string;
	options?: any;
}

export interface Configuration {
	port?: number;

	logger?: ModuleDefinition;

	dicomFileRepository?: ModuleDefinition;

	dumper?: ModuleDefinition;

	imageEncoder?: ModuleDefinition;

	cache?: {
		memoryThreshold?: number;
	};

	authorization?: {
		enabled: boolean;
		expire?: number;
		allowFrom?: string;
	};

}
