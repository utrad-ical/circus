import { ModuleDefinition } from './config/Configuration';

export default async function loadModule<T>(
  baseDir: string,
  config: ModuleDefinition
): Promise<T> {
  const { module: src, options, type = 'Instance' } = config;
  let instance: T;
  if (typeof src === 'string') {
    const creator = /\\/.test(src)
      ? (await import(`${src}`)).default
      : (await import(`${baseDir}/${src}`)).default;
    if (type === 'HoF') {
      instance = await creator(options);
    } else {
      instance = new creator(options);
    }
  } else {
    instance = src;
  }

  return instance;
}
