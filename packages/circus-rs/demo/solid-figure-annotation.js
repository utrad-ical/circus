'use strict';

const rs = circusrs;

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

  function toPartialVolumeDescriptor(str) {
    const [start, end, delta] = $.map(str.split(':'), function(value) {
      const num = parseInt(value, 10);
      return isNaN(num) ? undefined : num;
    });

    if (start === undefined && end === undefined && delta === undefined) {
      return undefined;
    } else if (start !== undefined && end !== undefined) {
      return { start: start, end: end, delta: delta };
    } else {
      throw new Error(
        'Invalid partial volume descriptor specified. ' +
          'partial volume descriptor must be in the form of `startImgNum:endImgNum(:imageDelta)`'
      );
    }
  }
  const partialVolumeDescriptor = toPartialVolumeDescriptor(
    config.partialVolumeDescriptor
  );

  const volumeLoader = new rs.RsVolumeLoader({
    seriesUid: config.seriesUid,
    partialVolumeDescriptor: partialVolumeDescriptor,
    rsHttpClient
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

    v.setState({
      ...v.getState(),
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

  rs.registerTool('resetPlanes', rs.ResetPlanesTool);
  rs.registerToolInstance(
    'rotxPlus30',
    rs.createStaticRotationTool([30, 0], 3)
  );
  rs.registerToolInstance(
    'rotxMinus30',
    rs.createStaticRotationTool([-30, 0], 3)
  );
  rs.registerToolInstance(
    'rotyPlus30',
    rs.createStaticRotationTool([0, 30], 3)
  );
  rs.registerToolInstance(
    'rotyMinus30',
    rs.createStaticRotationTool([0, -30], 3)
  );
  rs.registerToolInstance('dumpState', rs.createDumpStateTool(3));
  rs.registerToolInstance('dumpAnnotation', rs.createDumpAnnotationTool(3));

  const toolbar = rs.createToolbar(container, [
    'hand',
    // 'window',
    'zoom',
    'pager',
    'celestialRotate',
    // 'brush',
    // 'eraser',
    // 'bucket',
    'circle',
    // 'rectangle',
    'point',
    'ellipsoid',
    'cuboid',
    'resetPlanes',
    'rotxPlus30',
    'rotxMinus30',
    'rotyPlus30',
    'rotyMinus30',
    'dumpState',
    'dumpAnnotation'
  ]);

  toolbar.bindViewer(viewer1);
  toolbar.bindViewer(viewer2);
  toolbar.bindViewer(viewer3);
  toolbar.bindViewer(viewer4);

  setTimeout(() => {
    const fig = new rs.Ellipsoid();
    fig.editable = true;
    fig.color = '#ff0000';
    fig.width = 3;
    fig.min = [93.58974358974362, 152.56410256410254, 67.21153846153844];
    fig.max = [306.41025641025647, 243.5897435897436, 286.44230769230774];
    fig.boundingBoxOutline = { width: 1, color: '#ff0000' };
    fig.boundingBoxBones = { width: 1, color: '#ffff00' };
    fig.boundingBoxCrossSectionalShape = { width: 1, color: '#00ffff' };

    comp.addAnnotation(fig);
    comp.annotationUpdated();

    const state1 = {
      type: 'mpr',
      window: {
        level: 40,
        width: 350
      },
      interpolationMode: 'trilinear',
      section: {
        origin: [5.036015358780475, -2.200536920129224, 128.73052401114236],
        xAxis: [373.4315973229449, 71.90199062638484, -124.01187791819329],
        yAxis: [-1.7436810353162562, 348.29543247375403, 196.6907504036925]
      }
    };

    const state2 = {
      type: 'mpr',
      window: {
        level: 40,
        width: 350
      },
      interpolationMode: 'trilinear',
      section: {
        origin: [84.08155204502285, 135.83069150762358, 397.3361010570532],
        xAxis: [324.2730903751294, -111.87876577175689, -205.74281185001618],
        yAxis: [-143.33806785805604, 183.08575985554955, -325.4747345660419]
      }
    };

    const state3 = {
      type: 'mpr',
      window: {
        level: 40,
        width: 350
      },
      interpolationMode: 'trilinear',
      section: {
        origin: [0, 0, 178.75],
        xAxis: [400, 0, 0],
        yAxis: [0, 400, 0]
      }
    };

    let count = 0;
    const moveToRight = () => {
      if (count++ < 30) {
        const state = {
          ...state3,
          section: {
            ...state3.section,
            origin: [-count * 30, 0, 178.75]
          }
        };
        viewer4.setState(state);
        setTimeout(moveToRight, 500);
      }
    };
    // moveToRight();

    // const state = {
    //   type: 'mpr',
    //   window: {
    //     level: 40,
    //     width: 350
    //   },
    //   interpolationMode: 'trilinear',
    //   section: {
    //     origin: [245.34625671492938, 254.0390248586219, 392.8100703338916],
    //     xAxis: [1.7436810353164667, -348.29543247375346, -196.69075040369282],
    //     yAxis: [-143.33806785805604, 183.08575985554955, -325.47473456604183]
    //   }
    // };

    // const state = {
    //   type: 'mpr',
    //   window: {
    //     level: 40,
    //     width: 350
    //   },
    //   interpolationMode: 'trilinear',
    //   section: {
    //     origin: [122.51334467251235, 368.5115300104794, -40.25846539213779],
    //     xAxis: [-288.37834606672317, -192.78731556102412, 199.17575273761034],
    //     yAxis: [276.2387699148572, -223.74309361725403, 183.38803138292852]
    //   }
    // };

    viewer4.setState(state2);
  }, 500);
});
