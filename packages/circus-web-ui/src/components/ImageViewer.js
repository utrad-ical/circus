import React from 'react';
import Viewer from 'circus-rs/viewer/Viewer';
import { createOrthogonalMprSection } from 'circus-rs/section-util';
import { toolFactory } from 'circus-rs/tool/tool-initializer';
import EventEmitter from 'events';
import classnames from 'classnames';

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
    if (!this.viewer) return;
    if (this.props.stateChanger !== prevProps.stateChanger) {
      if (prevProps.stateChanger instanceof EventEmitter) {
        prevProps.stateChanger.removeAllListeners('change');
      }
      if (this.props.stateChanger instanceof EventEmitter) {
        this.props.stateChanger.on('change', this.changeState);
      }
    }
    if (this.props.composition !== prevProps.composition) {
      this.viewer.setComposition(this.props.composition);
    }
    if (this.props.tool !== prevProps.tool) {
      this.viewer.setActiveTool(this.props.tool);
    }
  }

  componentDidMount() {
    try {
      const {
        onCreateViewer,
        orientation = 'axial',
        composition,
        onImageReady,
        initialTool = toolFactory('pager')
      } = this.props;

      const setOrientation = () => {
        const state = viewer.getState();
        const src = this.props.composition.imageSource;
        const mmDim = src.mmDim();
        let newState = {
          ...state,
          section: createOrthogonalMprSection(
            viewer.getResolution(),
            mmDim,
            orientation
          )
        };
        if (typeof onImageReady === 'function') {
          const modifiedState = onImageReady(newState, viewer, orientation);
          if (modifiedState) newState = modifiedState;
        }
        viewer.setState(newState);
        viewer.removeListener('imageReady', setOrientation);
      };

      const container = this.container;
      const viewer = new Viewer(container);
      this.viewer = viewer;
      if (typeof onCreateViewer === 'function') onCreateViewer(viewer);

      if (this.props.stateChanger instanceof EventEmitter) {
        this.props.stateChanger.on('change', this.changeState);
      }

      viewer.on('imageReady', setOrientation);

      if (composition) {
        viewer.setComposition(composition);
      }
      viewer.setActiveTool(initialTool);
    } catch (err) {
      this.setState({ hasError: true });
    }
  }

  componentWillUnmount() {
    const { onDestroyViewer } = this.props;
    if (this.viewer) {
      this.viewer.dispose();
      if (typeof onDestroyViewer === 'function') onDestroyViewer(this.viewer);
    }
  }

  changeState = changer => {
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
