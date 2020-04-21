export interface ModuleDefinition {
  type: string;
  options?: any;
}

export interface CacheOptions {
  memoryThreshold?: number; // in bytes
  maxAge?: number; // in seconds
}

export interface RsServerOptions {
  port?: number;
  globalIpFilter?: string;
  authorization?: {
    enabled?: boolean;
    expire?: number;
    tokenRequestIpFilter?: string;
  };
}

export interface Configuration {
  rsServer?: { options?: RsServerOptions };
  volumeProvider?: { options?: { cache?: CacheOptions } };
  rsLogger?: ModuleDefinition;
  dicomFileRepository?: ModuleDefinition;
  imageEncoder?: ModuleDefinition;
}
