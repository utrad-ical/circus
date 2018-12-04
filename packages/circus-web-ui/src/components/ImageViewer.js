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
    if (this.props.stateChanger instanceof EventEmitter) {
      this.props.stateChanger.on('change', this.changeState);
    }
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
    this.viewer.setActiveTool(this.props.tool);
  }

  componentDidMount() {
    try {
      const setOrientation = () => {
        const state = viewer.getState();
        const src = this.props.composition.imageSource;
        const mmDim = src.mmDim();
        state.section = createOrthogonalMprSection(
          viewer.getResolution(),
          mmDim,
          orientation
        );
        viewer.setState(state);
        viewer.removeListener('draw', setOrientation);
      };

      const container = this.container;
      const viewer = new Viewer(container);

      const orientation = this.props.orientation || 'axial';

      viewer.on('imageReady', setOrientation);

      if (this.props.composition) {
        viewer.setComposition(this.props.composition);
      }
      const initialTool = this.props.initialTool
        ? this.props.initialTool
        : toolFactory('pager');

      viewer.setActiveTool(initialTool);

      this.viewer = viewer;
    } catch (err) {
      this.setState({ hasError: true });
    }
  }

  componentWillUnmount() {
    if (this.viewer) this.viewer.dispose();
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
