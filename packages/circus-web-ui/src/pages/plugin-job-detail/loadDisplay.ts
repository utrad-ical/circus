import {
  Display,
  Choice,
  Dump,
  Locator,
  LesionCandidates,
  Numeric,
  Text,
  VolumeOverlay,
  Gallery,
  Tags
} from '@utrad-ical/circus-ui-kit';

// https://github.com/module-federation/module-federation-examples/tree/master/advanced-api/dynamic-remotes

const builtInDisplays: { [name: string]: Display<any, any> } = {
  Choice,
  Dump,
  Locator,
  LesionCandidates,
  Numeric,
  Text,
  VolumeOverlay,
  Gallery,
  Tags
};

const loaded = new Map<string, true>();

const loadDynamicScript = async (
  name: string,
  pluginId: string
): Promise<void> => {
  if (loaded.has(name)) return;
  const url = `/api/plugin-displays/${pluginId}/displays/remoteEntry.js`;
  const script = await (await fetch(url)).text();
  const element = document.createElement('script');
  element.text = script.replace(
    /http:\/\/localhost:\d{1,5}\//g,
    `/api/plugin-displays/${pluginId}/displays/`
  );
  element.type = 'text/javascript';
  document.head.appendChild(element);
  loaded.set(name, true);
};

declare const __webpack_init_sharing__: any;
declare const __webpack_share_scopes__: any;

const loadExternalDisplay = async <O extends object, F>(
  name: string,
  pluginId: string
): Promise<Display<O, F>> => {
  await loadDynamicScript(name, pluginId);
  await __webpack_init_sharing__('default');
  const container = (window as any)['CircusCsModule'] as any;
  await container.init(__webpack_share_scopes__.default);
  const factory = await container.get('./' + name);
  const Display = factory().default;
  return Display;
};

const loadDisplay = (pluginId: string) => {
  return async <O extends object, F>(name: string): Promise<Display<O, F>> => {
    if (name in builtInDisplays) {
      return builtInDisplays[name];
    } else if (name.startsWith('@')) {
      return loadExternalDisplay(name.slice(1), pluginId);
    } else {
      throw new Error('Invalid display name');
    }
  };
};

export default loadDisplay;
