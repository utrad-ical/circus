import * as rs from '@utrad-ical/circus-rs/src/browser';
import {
  createOrthogonalMprSection,
  OrientationString,
  sectionTo2dViewState
} from '@utrad-ical/circus-rs/src/browser/section-util';
import ToolBaseClass from '@utrad-ical/circus-rs/src/browser/tool/Tool';
import { toolFactory } from '@utrad-ical/circus-rs/src/browser/tool/tool-initializer';
import setImmediate from '@utrad-ical/circus-rs/src/browser/util/setImmediate';
import classnames from 'classnames';
import { EventEmitter } from 'events';
import React, { useEffect, useRef, useState } from 'react';

export const setOrthogonalOrientation = (orientation: OrientationString) => {
  return (viewer: rs.Viewer, initialViewState: rs.MprViewState) => {
    if (initialViewState.type !== 'mpr') return;
    const src = viewer.getComposition()!.imageSource as rs.MprImageSource;
    const mmDim = src.mmDim();
    const newState: rs.MprViewState = {
      ...initialViewState,
      section: createOrthogonalMprSection(
        viewer.getResolution(),
        mmDim,
        orientation
      )
    };
    return newState;
  };
};

export const getInitial2dViewState = (
  viewer: rs.Viewer,
  initialViewState: rs.TwoDimensionalViewState
) => {
  if (initialViewState.type !== '2d') return;
  const src = viewer.getComposition()!
    .imageSource as rs.TwoDimensionalImageSource;
  const mmDim = src.mmDim();
  const section = createOrthogonalMprSection(
    viewer.getResolution(),
    mmDim,
    'axial',
    0
  );
  const newState = sectionTo2dViewState(initialViewState, section);
  return newState;
};

const defaultTool = toolFactory('pager');

export type InitialStateSetterFunc<T extends rs.ViewState> = (
  viewer: rs.Viewer,
  state: T,
  id?: string | number
) => T;

export type StateChangerFunc<T extends rs.ViewState> = (
  state: T,
  viewer: rs.Viewer,
  id?: string | number
) => T;

/**
 * StateChanger is used to change the view state of a Viewer imperatively.
 */
export interface StateChanger<T extends rs.ViewState> {
  (changeFunc: StateChangerFunc<T>): void;
  on: (cb: (changeFunc: StateChangerFunc<T>) => void) => void;
  off: (cb: (changeFunc: StateChangerFunc<T>) => void) => void;
}

export const createStateChanger = <T extends rs.ViewState = rs.ViewState>() => {
  const emitter = new EventEmitter();
  const changer: StateChanger<T> = changeFunc => {
    emitter.emit('change', changeFunc);
  };
  changer.on = cb => emitter.on('change', cb);
  changer.off = cb => emitter.off('change', cb);
  return changer;
};

const noop = () => {};

/**
 * Wraps CIRCUS RS Dicom Viewer.
 */
const ImageViewer: React.FC<{
  className?: string;
  composition?: rs.Composition;
  stateChanger?: StateChanger<any>;
  tool?: ToolBaseClass;
  initialStateSetter: InitialStateSetterFunc<any>;
  id?: string | number;
  onCreateViewer?: (viewer: rs.Viewer, id?: string | number) => void;
  onDestroyViewer?: (viewer: rs.Viewer) => void;
  onViewStateChange?: (viewer: rs.Viewer, id?: string | number) => void;
  onMouseUp?: () => void;
  onMouseDown?: (id?: string | number) => void;
  activeKeydown?: boolean;
}> = props => {
  const {
    className,
    composition,
    stateChanger,
    tool = defaultTool,
    id,
    initialStateSetter,
    onCreateViewer = noop,
    onDestroyViewer = noop,
    onViewStateChange = noop,
    onMouseUp = noop,
    onMouseDown = noop,
    activeKeydown = false
  } = props;

  const [viewer, setViewer] = useState<rs.Viewer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialStateSet = useRef<boolean>(false);

  const savedInitialStateSetter = useRef(initialStateSetter);
  useEffect(() => {
    savedInitialStateSetter.current = initialStateSetter;
  }, [initialStateSetter]);

  // Handle creation of viewer
  useEffect(() => {
    const viewer = new rs.Viewer(containerRef.current!);
    onCreateViewer(viewer, id);
    setViewer(viewer);
    viewer.on('imageReady', () => {
      if (typeof savedInitialStateSetter.current === 'function') {
        const baseState = composition!.imageSource.initialState(viewer);
        const viewState = savedInitialStateSetter.current(
          viewer,
          baseState,
          id
        );
        viewer.setState(viewState);
      }
      initialStateSet.current = true;
    });
    return () => {
      onDestroyViewer(viewer);
      viewer.removeAllListeners();
      viewer.dispose();
    };
  }, [id, onCreateViewer, onDestroyViewer]);

  // Handle view state change
  useEffect(() => {
    if (!viewer) return;
    const handler = () => {
      if (initialStateSet.current) onViewStateChange(viewer, id);
    };
    viewer.on('stateChange', handler);
    return () => {
      viewer.off('stateChange', handler);
    };
  }, [viewer, onViewStateChange, id]);

  // Handle onMouseUp
  useEffect(() => {
    const container = containerRef.current!;
    container.addEventListener('mouseup', onMouseUp);
    return () => {
      container.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseUp]);

  // Handle onMouseUp
  useEffect(() => {
    if (!id) return;
    const container = containerRef.current!;
    const handleMouseDown = () => onMouseDown(id);
    container.addEventListener('mousedown', handleMouseDown);
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onMouseDown, id]);

  // Handle composition change
  useEffect(() => {
    if (!viewer || !composition) return;
    if (viewer.getComposition() === composition) return;
    // Ensure borowser rendering at least once.
    setImmediate(() => viewer.setComposition(composition));
    initialStateSet.current = false;
    return () => {
      viewer.clearComposition;
    };
  }, [viewer, composition]);

  // Handle stateChanger
  useEffect(() => {
    if (!stateChanger) return;
    const handleChangeState = (changer: StateChangerFunc<rs.ViewState>) => {
      if (!viewer) return;
      const viewState = viewer.getState();
      if (!viewState) return;
      viewer.setState(changer(viewState, viewer, id));
    };
    stateChanger.on(handleChangeState);
    return () => {
      stateChanger.off(handleChangeState);
    };
  }, [viewer, stateChanger, id]);

  // Handle tool change
  useEffect(() => {
    if (!viewer) return;
    viewer.setActiveTool(tool);
  }, [viewer, tool]);

  // Handle keydown to simulate wheel event
  useEffect(() => {
    const container = containerRef.current!;
    const handleKeydown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLAnchorElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLButtonElement
      )
        return;
      const canvas = container.querySelector('canvas');
      if (canvas && activeKeydown) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          const wheelEvent = new WheelEvent('wheel', { deltaY: 1 });
          canvas.dispatchEvent(wheelEvent);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          const wheelEvent = new WheelEvent('wheel', { deltaY: -1 });
          canvas.dispatchEvent(wheelEvent);
        }
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [activeKeydown]);

  return (
    <div className={classnames('image-viewer', className)} ref={containerRef} />
  );
};

export default ImageViewer;
