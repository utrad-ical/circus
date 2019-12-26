import React, { useState, useEffect, useRef } from 'react';
import * as rs from 'circus-rs';
import { createOrthogonalMprSection } from 'circus-rs/section-util';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
import classnames from 'classnames';
import { EventEmitter } from 'events';

export const setOrthogonalOrientation = orientation => {
  return (viewer, initialViewState) => {
    if (initialViewState.type !== 'mpr') return;
    const src = viewer.composition.imageSource;
    const mmDim = src.mmDim();
    const newState = {
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

/**
 * Wraps CIRCUS RS Dicom Viewer.
 */
const ImageViewer = props => {
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

  const [viewer, setViewer] = useState(null);
  const containerRef = useRef();

  // Handle creation of viewer
  useEffect(
    () => {
      const viewer = new rs.Viewer(containerRef.current);
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
    const container = containerRef.current;
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
    const handleChangeState = changer => {
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

export const useStateChanger = () => {
  const stateChangerRef = useRef(undefined);
  if (!stateChangerRef.current) stateChangerRef.current = new EventEmitter();
  return stateChangerRef.current;
};
