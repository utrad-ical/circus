import {
  Display,
  Choice,
  Dump,
  Locator,
  LesionCandidates
} from '@utrad-ical/circus-cs-results';

// https://github.com/module-federation/module-federation-examples/tree/master/advanced-api/dynamic-remotes

const builtInDisplays: { [name: string]: Display<any, any> } = {
  Choice,
  Dump,
  Locator,
  LesionCandidates
};

const loaded = new Map<string, true>();

const loadDynamicScript = async (name: string): Promise<void> => {
  if (loaded.has(name)) return;
  const url = `/api/plugin-displays/${name}/remoteEntry.js`;
  const script = await (await fetch(url)).text();
  const element = document.createElement('script');
  element.text = script;
  element.type = 'text/javascript';
  document.head.appendChild(element);
  loaded.set(name, true);
};

declare const __webpack_init_sharing__: any;
declare const __webpack_share_scopes__: any;

const loadExternalDisplay = async <O extends object, F>(
  name: string
): Promise<Display<O, F>> => {
  await loadDynamicScript(name);
  await __webpack_init_sharing__('default');
  const container = (window as any)[name] as any;
  await container.init(__webpack_share_scopes__.default);
  const factory = await container.get('Display');
  const Display = factory().default;
  console.log({ Display });
  return Display;
};

const loadDisplay = async <O extends object, F>(
  name: string
): Promise<Display<O, F>> => {
  if (name in builtInDisplays) {
    return builtInDisplays[name];
  } else {
    return loadExternalDisplay(name);
  }
};

export default loadDisplay;
