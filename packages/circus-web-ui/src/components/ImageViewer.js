import React from 'react';
import * as rs from 'circus-rs';
import { createOrthogonalMprSection } from 'circus-rs/section-util';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
import EventEmitter from 'events';
import classnames from 'classnames';

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

/**
 * Wraps CIRCUS RS Dicom Viewer.
 */
export default class ImageViewer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.viewer = null;
    this.container = null;
  }

  componentDidUpdate(prevProps) {
    if (this.props.stateChanger !== prevProps.stateChanger) {
      if (prevProps.stateChanger instanceof EventEmitter) {
        prevProps.stateChanger.removeListener('change', this.handleChangeState);
      }
      if (this.props.stateChanger instanceof EventEmitter) {
        this.props.stateChanger.on('change', this.handleChangeState);
      }
    }
    if (this.props.composition !== prevProps.composition) {
      this.viewer.setComposition(this.props.composition);
    }
    if (this.props.tool !== prevProps.tool) {
      this.viewer.setActiveTool(this.props.tool);
    }
  }

  setInitialState = () => {
    const viewer = this.viewer;
    const { initialStateSetter } = this.props;
    if (typeof initialStateSetter === 'function') {
      const state = viewer.getState();
      const newState = initialStateSetter(viewer, state);
      viewer.setState(newState);
    }
  };

  componentDidMount() {
    try {
      const {
        onCreateViewer,
        initialTool = toolFactory('pager'),
        stateChanger,
        composition,
        id,
        onMouseUp = () => {}
      } = this.props;
      const container = this.container;

      container.addEventListener('mouseup', onMouseUp);

      const viewer = new rs.Viewer(container);
      this.viewer = viewer;

      if (typeof onCreateViewer === 'function') onCreateViewer(viewer, id);
      if (stateChanger instanceof EventEmitter) {
        stateChanger.on('change', this.handleChangeState);
      }
      this.viewer.on('imageReady', this.setInitialState);
      if (composition) {
        this.viewer.setComposition(this.props.composition);
      }
      viewer.setActiveTool(initialTool);
    } catch (err) {
      this.setState({ hasError: true });
    }
  }

  componentWillUnmount() {
    const { onDestroyViewer, stateChanger } = this.props;
    if (stateChanger instanceof EventEmitter) {
      stateChanger.removeListener('change', this.handleChangeState);
    }
    if (this.viewer) {
      this.viewer.removeAllListeners();
      this.viewer.dispose();
      if (typeof onDestroyViewer === 'function') onDestroyViewer(this.viewer);
    }
  }

  handleChangeState = changer => {
    const state = this.viewer.getState();
    const newState = changer(state);
    this.viewer.setState(newState);
  };

  render() {
    const { className } = this.props;
    const { hasError } = this.state;
    if (hasError) return <div>Error</div>;
    return (
      <div
        className={classnames('image-viewer', className)}
        ref={r => (this.container = r)}
      />
    );
  }
}
