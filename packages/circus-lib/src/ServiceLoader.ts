interface ModuleConfig {
  [key: string]: { type: string; options?: any };
}

export interface Injectable<T> {
  dependencies?: Array<keyof T>;
}

export interface FunctionService<T, S> extends Injectable<T> {
  (deps: Partial<T>, options?: any): Promise<S>;
}

export interface ClassService<T, S> extends Injectable<T> {
  new (deps: Partial<T>, options?: any): S;
}

/**
 * A service can be either an (async) function or a class.
 * A service is provided with dependendent services
 * and the options as defined in configuration.
 */
type Service<T, S> = FunctionService<T, S> | ClassService<T, S>;

type ServiceDef<T, K extends keyof T> =
  | { type: 'service'; service: Service<T, T[K]> }
  | { type: 'factory'; factory: (config: ModuleConfig) => Promise<T[K]> };

type LoadedService<T, K extends keyof T> =
  | { status: 'loaded'; service: T[K] }
  | { status: 'loading'; promise: Promise<T[K]> };

function isClass<T, S>(fn: any): fn is ClassService<T, S> {
  return /^\s*class/.test(fn.toString());
}

/**
 * ModuleLoader is a small DI (IoC) container used by CIRCUS Project.
 * A concrete service can be determined via ModuleConfig.
 */
export default class ModuleLoader<T extends object = any> {
  /**
   * This holds a configuration typically loaded from some configuration file.
   */
  private config: ModuleConfig;

  /**
   * Registered services.
   * When a service itself is registered, it will be provided with dependencies.
   */
  private services: Partial<{ [K in keyof T]: ServiceDef<T, K> }>;
  private loadedServices: Partial<{ [K in keyof T]: LoadedService<T, K> }>;

  constructor(config: ModuleConfig = {}) {
    this.config = config;
    this.services = {};
    this.loadedServices = {};
  }

  /**
   * Directly bind a new concrete service.
   * @param name The service (interface) name.
   * @param service The concrete service class/function.
   *   It can have a `depends` property that declares its dependencies
   *   as an array of strings.
   *   These dependencies will be automatically injected.
   */
  public register<K extends keyof T>(name: K, service: Service<T, T[K]>): void {
    this.services[name] = { type: 'service', service };
  }

  public registerFactory<K extends keyof T>(
    name: K,
    factory: (config: ModuleConfig) => Promise<T[K]>
  ) {
    this.services[name] = { type: 'factory', factory };
  }

  /**
   * Creates a concrete service from the service name.
   * @param name The name of the required service.
   */
  public async get<K extends keyof T>(name: K): Promise<T[K]> {
    if (name in this.loadedServices) {
      const item: LoadedService<T, K> = this.loadedServices[name]!;
      if (item.status === 'loading') return await item.promise;
      else if (item.status === 'loaded') return item.service;
      else throw new Error();
    }
    if (!(name in this.services))
      throw new TypeError(`Service '${name}' is not registered`);
    const serviceOrFactory: ServiceDef<T, K> = this.services[name]!;
    const service =
      serviceOrFactory.type === 'service'
        ? await this.instanciateService(serviceOrFactory.service)
        : await serviceOrFactory.factory(this.config);
    this.loadedServices[name] = { status: 'loaded', service };
    return service;
  }

  private async createFromModule<K extends keyof T>(name: K, path: string) {
    const module = (await import(path)).default as Service<T, T[K]>;
    return await this.instanciateService(module);
  }

  private async instanciateService<S>(service: Service<T, S>): Promise<S> {
    const dependencies = service.dependencies || [];
    const deps: Partial<T> = {};
    for (const d of dependencies) {
      deps[d] = await this.get(d);
    }

    if (isClass(service)) {
      return new (service as ClassService<T, S>)(deps);
    } else {
      return (service as FunctionService<T, S>)(deps);
    }
  }
}
