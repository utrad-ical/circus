import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as rs from '@utrad-ical/circus-rs/src/browser';
import {
  createOrthogonalMprSection,
  OrientationString
} from '@utrad-ical/circus-rs/src/browser/section-util';
import { toolFactory } from '@utrad-ical/circus-rs/src/browser/tool/tool-initializer';
import classnames from 'classnames';
import { EventEmitter } from 'events';
import ToolBaseClass from '@utrad-ical/circus-rs/src/browser/tool/Tool';

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
    onMouseUp = noop
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
        const state = viewer.getState();
        const newState = savedInitialStateSetter.current(viewer, state, id);
        viewer.setState(newState);
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
      viewer.off('stageChange', handler);
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

  // Handle composition change
  useEffect(() => {
    if (!viewer || !composition) return;
    if (viewer.getComposition() === composition) return;
    viewer.setComposition(composition);
    initialStateSet.current = false;
  }, [viewer, composition]);

  // Handle stateChanger
  useEffect(() => {
    if (!stateChanger) return;
    const handleChangeState = (changer: StateChangerFunc<rs.ViewState>) => {
      if (!viewer) return;
      const state = viewer.getState();
      viewer.setState(changer(state, viewer, id));
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

  return (
    <div className={classnames('image-viewer', className)} ref={containerRef} />
  );
};

export default ImageViewer;
