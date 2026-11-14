import * as rs from '../src/browser/index.ts';
import '../src/browser/circus-rs.css';
import { toPartialVolumeDescriptor } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const config = JSON.parse(localStorage.getItem('rs-demo-save'));

  if (!config) {
    alert('Not configured');
    return;
  } else {
    config.sourceClass = rs.HybridMprImageSource;
  }

  // Initialize composition
  const rsHttpClient = new rs.RsHttpClient(config.server);

  const partialVolumeDescriptor = toPartialVolumeDescriptor(
    config.partialVolumeDescriptor
  );

  const wsClient = new rs.WebSocketClient(
    config.server.replace(/^http/, 'ws') + '/ws/volume'
  );
  const volumeLoader = new rs.RsProgressiveVolumeLoader({
    seriesUid: config.seriesUid,
    partialVolumeDescriptor: partialVolumeDescriptor,
    rsHttpClient,
    transferConnectionFactory: rs.createTransferConnectionFactory(wsClient)
  });
  const imageSource = new config.sourceClass({
    volumeLoader,
    rsHttpClient,
    seriesUid: config.seriesUid,
    partialVolumeDescriptor: partialVolumeDescriptor
  });

  // Prepare composition.
  const comp = new rs.Composition(imageSource);

  // Initialize viewer
  const div1 = document.getElementById('viewer1');
  const viewer1 = new rs.Viewer(div1);
  viewer1.setComposition(comp);

  const div2 = document.getElementById('viewer2');
  const viewer2 = new rs.Viewer(div2);
  viewer2.setComposition(comp);

  const div3 = document.getElementById('viewer3');
  const viewer3 = new rs.Viewer(div3);
  viewer3.setComposition(comp);

  const div4 = document.getElementById('viewer4');
  const viewer4 = new rs.Viewer(div4);
  viewer4.setComposition(comp);

  const referenceLine1 = new rs.ReferenceLine(viewer1, { color: '#993300' });
  const referenceLine2 = new rs.ReferenceLine(viewer2, { color: '#3399ff' });
  const referenceLine3 = new rs.ReferenceLine(viewer3, { color: '#33ffee' });
  const referenceLine4 = new rs.ReferenceLine(viewer4, { color: '#ff6600' });
  comp.addAnnotation(referenceLine1);
  comp.addAnnotation(referenceLine2);
  comp.addAnnotation(referenceLine3);
  comp.addAnnotation(referenceLine4);

  const setOrientation = async (v, orientation) => {
    const imageSource = comp.imageSource;
    await imageSource.ready();
    const viewState = v.getState() || v.getRequestingState();
    if (!viewState) throw new Error('View state not initialized');
    v.setState({
      ...viewState,
      section: rs.createOrthogonalMprSection(
        v.getResolution(),
        imageSource.mmDim(),
        orientation
      )
    });
  };

  setOrientation(viewer1, 'axial');
  setOrientation(viewer2, 'sagittal');
  setOrientation(viewer3, 'coronal');
  setOrientation(viewer4, 'axial');

  // Initialize toolbar
  const container = document.getElementById('toolbar');

  const toolbar = rs.createToolbar(container, [
    'hand',
    'window',
    'zoom',
    'pager',
    'celestialRotate',
    // 'brush',
    // 'eraser',
    // 'bucket',
    'circle',
    'rectangle',
    'point',
    'ellipsoid',
    'cuboid'
  ]);

  toolbar.bindViewer(viewer1);
  toolbar.bindViewer(viewer2);
  toolbar.bindViewer(viewer3);
  toolbar.bindViewer(viewer4);

  const fig = new rs.Ellipsoid();
  fig.editable = true;
  fig.color = '#ff0000';
  fig.width = 3;
  // fig.fillColor = 'rgba(102, 205, 170, 0.3)'; // #66cdaa mediumaquamarine
  fig.min = [93.58974358974362, 152.56410256410254, 67.21153846153844];
  fig.max = [306.41025641025647, 243.5897435897436, 286.44230769230774];
  fig.boundingBoxOutline = { width: 1, color: '#ff0000' };
  fig.boundingBoxCrossHair = { width: 1, color: '#ffff00' };
  fig.boundingBoxCrossSectionalShape = { width: 1, color: '#00ffff' };

  comp.addAnnotation(fig);
  comp.annotationUpdated();
});
