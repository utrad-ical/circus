import path from 'path';

interface ModuleConfig {
  [key: string]: { type?: string; options?: any };
}

interface Injectable {
  // declared as string[] rather than (keyof T)[]
  // so that implementations can specify their dependencies
  // without referring to the whole list of services
  dependencies?: string[];
}

export interface FunctionService<S, D = any> extends Injectable {
  (options: any, deps: D): Promise<S>;
}

export interface ClassService<S, D = any> extends Injectable {
  new (options: any, deps: D): S;
}

/**
 * A service can be either an (async) function or a class.
 * A service is provided with dependendent services
 * and the options as defined in configuration.
 */
export type Service<S, D = any> = FunctionService<S, D> | ClassService<S, D>;

type ServiceDef<T, K extends keyof T> =
  | { type: 'service'; service: Service<T[K]> }
  | { type: 'factory'; factory: (config: ModuleConfig) => Promise<T[K]> };

type LoadedService<T, K extends keyof T> =
  | { status: 'loaded'; service: T[K] }
  | { status: 'loading'; promise: Promise<T[K]> };

function isClass<S, D>(fn: any): fn is ClassService<S, D> {
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
  public register<K extends keyof T>(name: K, service: Service<T[K]>): void {
    this.services[name] = { type: 'service', service };
  }

  /**
   * Register a service via a loader function.
   * Use this as a last resort; use `register` whenever possible.
   * @param name The service (interface) name.
   * @param factory The async loader function to bind.
   */
  public registerFactory<K extends keyof T>(
    name: K,
    factory: (config: ModuleConfig) => Promise<T[K]>
  ) {
    this.services[name] = { type: 'factory', factory };
  }

  /**
   * Register a service with directory-based autoloading.
   * The concrete type will be determined based on the
   * `${name}.type` parameter.
   * For example, `this.registerDirectory('weapon', './weapons', 'Sword')`
   * will load the deafault weapon from `'./weapons/Sword'`.
   * If the config has `{ weapon: { type: 'Shuriken' } }`,
   * it will load from `'./weapons/Shuriken'` instead.
   * @param name The service (interface) name.
   * @param directoryPath The path to the directory which holds the
   *   concrete implementations of the corresponding interface.
   * @param defaultModuleName The default module name used when
   *   the `type` parameter is omitted.
   */
  public registerDirectory<K extends keyof T>(
    name: K,
    directoryPath: string,
    defaultModuleName: string
  ) {
    const loader = async (config: ModuleConfig) => {
      let module: string;
      if (name in config) {
        const type: string = (config as any)[name].type || defaultModuleName;
        module = /\//.test(type)
          ? type // reference by absolute path
          : path.join(directoryPath, (config as any)[name].type);
      } else {
        module = path.join(directoryPath, defaultModuleName);
      }
      return await this.createFromModule(name, module);
    };
    this.registerFactory(name, loader);
  }

  /**
   * Creates a concrete service from the service name.
   * @param name The name of the required service.
   */
  public async get<K extends keyof T>(name: K): Promise<T[K]> {
    if (name in this.loadedServices) {
      const item: LoadedService<T, K> = this.loadedServices[name]!;
      if (item.status === 'loading') {
        return await item.promise;
      } else {
        return item.service;
      }
    }
    if (!(name in this.services))
      throw new TypeError(`Service '${name}' is not registered`);
    const serviceOrFactory: ServiceDef<T, K> = this.services[name]!;
    const promise =
      serviceOrFactory.type === 'service'
        ? this.instanciateService(name, serviceOrFactory.service)
        : serviceOrFactory.factory(this.config);
    this.loadedServices[name] = { status: 'loading', promise };
    promise.then(service => {
      this.loadedServices[name] = { status: 'loaded', service };
    });
    return promise;
  }

  private async createFromModule<K extends keyof T>(name: K, path: string) {
    const module = (await import(path)).default as Service<T[K]>;
    return await this.instanciateService(name, module);
  }

  private async instanciateService<K extends keyof T>(
    name: K,
    service: Service<T[K]>
  ): Promise<T[K]> {
    const dependencies = (service.dependencies as (keyof T)[]) || [];
    const deps: Partial<T> = {};
    for (const d of dependencies) {
      deps[d] = await this.get(d);
    }

    const options: any =
      name in this.config ? (this.config as any)[name].options : undefined;

    if (isClass(service)) {
      return new (service as ClassService<T[K]>)(options, deps);
    } else {
      return (service as FunctionService<T[K]>)(options, deps);
    }
  }
}
