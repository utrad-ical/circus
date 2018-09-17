import { ModuleDefinition } from './config';

export default async function loadModule<T>(
  title: string,
  baseDir: string,
  config: ModuleDefinition
): Promise<T> {
  const { module, options } = config;
  let instance: T;
  let name: string;
  if (typeof module === 'string') {
    name = module;
    if (/\\/.test(module)) {
      const { default: TheClass } = await import(`${module}`);
      instance = new TheClass(options);
    } else {
      const { default: TheClass } = await import(`${baseDir}/${module}`);
      instance = new TheClass(options);
    }
  } else {
    name = `(customized ${title})`;
    instance = module;
  }

  return instance;
}
