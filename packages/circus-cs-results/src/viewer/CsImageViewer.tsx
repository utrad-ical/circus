import {
  Composition,
  Tool,
  Viewer,
  ViewState
} from '@utrad-ical/circus-rs/src/browser';
import React, { useEffect, useRef, useState } from 'react';

export type StateChangerFunc<T extends ViewState> = (
  state: T,
  viewer: Viewer
) => T;

interface StateChangeEvent<T extends ViewState> extends Event {
  stateChanger: StateChangerFunc<T>;
}

/**
 * StateChanger is used to change the view state of a Viewer imperatively.
 */
export interface StateChanger<T extends ViewState> {
  (changeFunc: StateChangerFunc<T>): void;
  on: (cb: (changeFunc: StateChangerFunc<T>) => void) => void;
  off: (cb: (changeFunc: StateChangerFunc<T>) => void) => void;
}

export const createStateChanger = <T extends ViewState = ViewState>() => {
  const map = new WeakMap<Function, EventListener>();
  const emitter = new EventTarget();
  const changer: StateChanger<T> = changeFunc => {
    const ev = new Event('change') as StateChangeEvent<T>;
    ev.stateChanger = changeFunc;
    emitter.dispatchEvent(ev);
  };
  changer.on = cb => {
    if (map.get(cb)) return;
    const func = ((ev: StateChangeEvent<T>) =>
      cb(ev.stateChanger)) as EventListener;
    map.set(cb, func);
    emitter.addEventListener('change', func);
  };
  changer.off = cb => {
    if (map.get(cb)) {
      emitter.removeEventListener('change', map.get(cb)!);
    }
  };
  return changer;
};

export const ImageViewer: React.FC<{
  composition: Composition;
  tool: Tool;
  stateChanger?: StateChanger<any>;
}> = props => {
  const { composition, tool, stateChanger } = props;
  const viewerDivRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);

  useEffect(() => {
    if (!composition) return;
    const viewer = new Viewer(viewerDivRef.current!);
    viewer.setComposition(composition);
    setViewer(viewer);
  }, [composition]);

  useEffect(() => {
    if (!viewer) return;
    viewer.setActiveTool(tool);
  }, [tool]);

  useEffect(() => {
    if (stateChanger) {
      const cb = (changer: StateChangerFunc<any>) => {
        if (!viewer) return;
        viewer.setState(changer(viewer.getState(), viewer));
      };
      stateChanger.on(cb);
      return () => {
        stateChanger.off(cb);
      };
    }
  }, [stateChanger]);

  return <div ref={viewerDivRef} />;
};
