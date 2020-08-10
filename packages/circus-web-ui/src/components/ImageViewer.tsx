import React, { useState, useEffect, useRef } from 'react';
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

type StateChangerFunc<T extends rs.ViewState> = (state: T) => T;

interface StateChanger<T extends rs.ViewState> extends EventEmitter {
  on(event: 'change', listener: (changer: StateChangerFunc<T>) => void): this;
  emit(event: 'change', changer: StateChangerFunc<T>): boolean;
}

/**
 * Wraps CIRCUS RS Dicom Viewer.
 */
const ImageViewer: React.FC<{
  className?: string;
  composition: rs.Composition;
  stateChanger?: EventEmitter;
  tool: ToolBaseClass;
  id: string | number;
  initialStateSetter: any;
  onCreateViewer: (viewer: rs.Viewer, id: string | number) => void;
  onDestroyViewer: (viewer: rs.Viewer) => void;
  onMouseUp: () => void;
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
    if (!(stateChanger instanceof EventEmitter)) return;
    const handleChangeState = (changer: StateChangerFunc<rs.ViewState>) => {
      if (!viewer) return;
      const state = viewer.getState();
      viewer.setState(changer(state));
    };
    stateChanger.on('change', handleChangeState);
    return () => {
      stateChanger.removeListener('change', handleChangeState);
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

export const useStateChanger = <T extends rs.ViewState>() => {
  const stateChangerRef = useRef<StateChanger<T>>();
  if (!stateChangerRef.current) stateChangerRef.current = new EventEmitter();
  return stateChangerRef.current!;
};
