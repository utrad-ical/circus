// Based on circus-rs\src\server\ModuleLoader.ts
export default function detect(descriptor: { module: string; options: any }) {
  let loadPath: string;
  if (/\//.test(descriptor.module)) {
    // Load external module if module path is explicitly set
    loadPath = descriptor.module;
  } else {
    // Load built-in modules
    loadPath = __dirname + "/" + descriptor.module;
  }
  let repositoryClass = require(loadPath).default;
  return new repositoryClass(descriptor.options || {});
}
