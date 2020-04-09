export interface ModuleDefinition {
  type: string;
  options?: any;
}

interface CacheOptions {
  memoryThreshold?: number; // in bytes
  maxAge?: number; // in seconds
}

export interface Configuration {
  rsServer: {
    options: {
      port: number;
      globalIpFilter: string;
      authorization: {
        enabled: boolean;
        expire: number;
        tokenRequestIpFilter: string;
      };
    };
  };

  volumeProvider: {
    options: {
      cache?: CacheOptions;
    };
  };

  rsLogger: ModuleDefinition;

  dicomFileRepository: ModuleDefinition;

  imageEncoder: ModuleDefinition;
}
