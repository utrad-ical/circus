import {
  Composition,
  Tool,
  Viewer,
  ViewState
} from '@utrad-ical/circus-rs/src/browser';
import React, { useEffect, useRef, useState } from 'react';
import classnames from 'classnames';

export type StateChangerFunc<T extends ViewState> = (
  state: T,
  viewer: Viewer,
  id?: string | number
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
  id?: string | number;
  composition: Composition;
  tool: Tool;
  initialStateSetter?: StateChangerFunc<any>;
  stateChanger?: StateChanger<any>;
  className?: string;
  onMouseUp?: (ev: MouseEvent) => any;
}> = props => {
  const {
    id,
    composition,
    tool,
    initialStateSetter,
    stateChanger,
    className,
    onMouseUp
  } = props;
  const viewerDivRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);

  useEffect(() => {
    if (!composition) return;
    setViewer(viewer => {
      if (viewer) {
        if (viewer.getComposition() !== composition) {
          viewer.setComposition(composition);
        }
        return viewer;
      } else {
        const newViewer = new Viewer(viewerDivRef.current!);
        newViewer.setComposition(composition);
        if (typeof initialStateSetter === 'function') {
          newViewer.on('imageReady', () => {
            const state = newViewer.getState();
            const newState = initialStateSetter(state, newViewer, id);
            newViewer.setState(newState);
          });
        }
        return newViewer;
      }
    });
  }, [composition, initialStateSetter]);

  useEffect(() => {
    if (!viewer) return;
    viewer.setActiveTool(tool);
  }, [viewer, tool]);

  // Handle onMouseUp
  useEffect(() => {
    if (!onMouseUp) return;
    const container = viewerDivRef.current!;
    container.addEventListener('mouseup', onMouseUp);
    return () => {
      container.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseUp]);

  useEffect(() => {
    if (stateChanger) {
      const cb = (changer: StateChangerFunc<any>) => {
        if (!viewer) return;
        viewer.setState(changer(viewer.getState(), viewer, id));
      };
      stateChanger.on(cb);
      return () => {
        stateChanger.off(cb);
      };
    }
  }, [stateChanger, viewer]);

  return (
    <div className={classnames('image-viewer', className)} ref={viewerDivRef} />
  );
};
