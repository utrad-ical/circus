import type { Display } from '@utrad-ical/circus-ui-kit';
import * as uiKit from '@utrad-ical/circus-ui-kit';
import {
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
import React from 'react';
import ReactDOM from 'react-dom';

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

/**
 * Custom displays of plug-ins are webpack Module Federation remotes
 * (`remoteEntry.js`, which registers itself as `window.CircusCsModule`).
 * Instead of relying on the Module Federation runtime of the host bundler,
 * we pass a hand-made share scope to the container, which tells the remote
 * to use these module instances of the host.
 * If a module is missing here, the remote silently falls back to its own
 * bundled copy, which breaks hooks and contexts (e.g., `useCsResults()`).
 */
const sharedModules: { [name: string]: { version: string; module: unknown } } =
  {
    react: { version: React.version, module: React },
    'react-dom': { version: ReactDOM.version, module: ReactDOM },
    // The ui-kit API version that existing plug-ins were built against
    '@utrad-ical/circus-ui-kit': { version: '0.3.0', module: uiKit }
  };

interface Container {
  init: (shareScope: object) => Promise<void> | void;
  get: (module: string) => Promise<() => any>;
}

/**
 * Creates a new share scope for each container
 * so that plug-ins cannot affect each other.
 */
const createShareScope = (pluginId: string) =>
  Object.fromEntries(
    Object.entries(sharedModules).map(([name, { version, module }]) => [
      name,
      {
        [version]: {
          get: () => {
            console.debug(
              `Plug-in ${pluginId.slice(0, 12)} uses ${name}@${version} of CIRCUS`
            );
            return Promise.resolve(() => module);
          },
          from: 'circus-web-ui',
          eager: true,
          loaded: 1
        }
      }
    ])
  );

const loadContainer = async (pluginId: string): Promise<Container> => {
  const baseUrl = `/api/plugin-displays/${pluginId}/displays/`;
  const res = await fetch(baseUrl + 'remoteEntry.js');
  if (!res.ok) throw new Error(`Failed to load displays of ${pluginId}`);
  const script = await res.text();
  const element = document.createElement('script');
  // remoteEntry.js has a hard-coded public path (http://localhost:<port>/)
  element.text = script.replace(/http:\/\/localhost:\d{1,5}\//g, baseUrl);
  element.type = 'text/javascript';
  // Every plug-in registers itself with the same global name,
  // so take it right after the script runs
  const w = window as any;
  delete w.CircusCsModule;
  document.head.appendChild(element);
  const container = w.CircusCsModule as Container | undefined;
  if (!container) throw new Error(`Invalid displays of ${pluginId}`);
  await container.init(createShareScope(pluginId));
  return container;
};

const containers = new Map<string, Promise<Container>>();

const getContainer = (pluginId: string): Promise<Container> => {
  if (!containers.has(pluginId)) {
    const promise = loadContainer(pluginId);
    promise.catch(() => containers.delete(pluginId));
    containers.set(pluginId, promise);
  }
  return containers.get(pluginId)!;
};

const loadExternalDisplay = async <O extends object, F>(
  name: string,
  pluginId: string
): Promise<Display<O, F>> => {
  const container = await getContainer(pluginId);
  const factory = await container.get('./' + name);
  return factory().default;
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
