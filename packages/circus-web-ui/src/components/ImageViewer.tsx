import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as rs from 'circus-rs';
import {
  createOrthogonalMprSection,
  OrientationString
} from 'circus-rs/section-util';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
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

export type StateChangerFunc<T extends rs.ViewState> = (state: T) => T;

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

/**
 * Wraps CIRCUS RS Dicom Viewer.
 */
const ImageViewer: React.FC<{
  className?: string;
  composition?: rs.Composition;
  stateChanger?: StateChanger<any>;
  tool: ToolBaseClass;
  initialStateSetter: any;
  id?: string | number;
  onCreateViewer?: (viewer: rs.Viewer, id?: string | number) => void;
  onDestroyViewer?: (viewer: rs.Viewer) => void;
  onMouseUp?: () => void;
}> = props => {
  const {
    className,
    composition,
    stateChanger,
    tool = defaultTool,
    id,
    initialStateSetter,
    onCreateViewer = () => {},
    onDestroyViewer = () => {},
    onMouseUp = () => {}
  } = props;

  const [viewer, setViewer] = useState<rs.Viewer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle creation of viewer
  useEffect(
    () => {
      const viewer = new rs.Viewer(containerRef.current!);
      onCreateViewer(viewer, id);
      setViewer(viewer);
      viewer.on('imageReady', () => {
        if (typeof initialStateSetter === 'function') {
          const state = viewer.getState();
          const newState = initialStateSetter(viewer, state);
          viewer.setState(newState);
        }
      });
      return () => {
        onDestroyViewer(viewer);
        viewer.removeAllListeners();
        viewer.dispose();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

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
    viewer.setComposition(composition);
  }, [viewer, composition]);

  // Handle stateChanger
  useEffect(() => {
    if (!stateChanger) return;
    const handleChangeState = (changer: StateChangerFunc<rs.ViewState>) => {
      if (!viewer) return;
      const state = viewer.getState();
      viewer.setState(changer(state));
    };
    stateChanger.on(handleChangeState);
    return () => {
      stateChanger.off(handleChangeState);
    };
  }, [viewer, stateChanger]);

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
