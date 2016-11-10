export interface ModuleDefinition {
	module?: string;
	options?: any;
}

export type IpFilterDefinition = Array<string | [string, string]>;

export interface Configuration {
	port?: number;

	logger?: ModuleDefinition;

	dicomFileRepository?: ModuleDefinition;

	dumper?: ModuleDefinition;

	imageEncoder?: ModuleDefinition;

	ipFilter?: IpFilterDefinition;

	cache?: {
		memoryThreshold?: number;
	};

	authorization?: {
		enabled: boolean;
		expire?: number;
		tokenRequestIpFilter?: IpFilterDefinition;
	};

}
