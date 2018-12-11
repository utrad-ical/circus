/*--
@title Default demo
@color #ffffdd
@viewerNotRequired

The following code initializes a viewer and a toolbar for you to get started.
Select an individual example item for details.
--*/

//--@include Initialize viewer
//--@include Initialize toolbar

/*--
@title Initialize composition
@hidden
--*/

// Prepare ImageSource object, using the options provided in the boxes above

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

/*--
@title Initialize viewer
@viewerNotRequired

Before jumping in to other examples, you must create a viewer.
This example shows minimum code to initialize CIRCUS RS.
--*/

//--@include Initialize composition

// Create a viewer and associate the composition with it.
// If there is an existing viewer in the div element, it will be cleared.
const div = document.getElementById('viewer');
viewer = new rs.Viewer(div);
viewer.setComposition(comp);

/*--
@title Initialize two viewers with cross reference line
@viewerNotRequired

Before jumping in to other examples, you must create a viewer.
This example shows minimum code to initialize CIRCUS RS.
--*/

//--@include Initialize composition

const div1 = document.getElementById('viewer');
viewer = new rs.Viewer(div1);
viewer.setComposition(comp);

const div2 = document.getElementById('viewer2');
viewer2 = new rs.Viewer(div2);
viewer2.setComposition(comp);

const referenceLine1 = new rs.ReferenceLine(viewer, {color: '#993300'});
const referenceLine2 = new rs.ReferenceLine(viewer2, {color: '#3399ff'});
comp.addAnnotation(referenceLine1);
comp.addAnnotation(referenceLine2);

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

setOrientation(viewer, 'axial');
setOrientation(viewer2, 'coronal');


/*--
@title Initialize toolbar
CIRCUS RS comes with a built-in tool bar.
--*/

const container = document.getElementById('toolbar');
container.innerHTML = ''; // Clear existing tool bar

const toolbar = rs.createToolbar(container, [
  'hand',
  'window',
  'zoom',
  'pager',
  'celestialRotate',
  'brush',
  'eraser',
  'bucket',
  'circle',
  'rectangle'
]);

if (viewer) toolbar.bindViewer(viewer);
if (viewer2) toolbar.bindViewer(viewer2);

// setInterval( function(){ viewer.render(); }, 30 );

/*--
@title Change interpolation mode
Set interpolationMode to 'trilinear' to enable trilinear interpolation.
--*/

function setInterpolation(mode) {
  const viewState = viewer.getState();
  viewState.interpolationMode = mode;
  viewer.setState(viewState);
}

const mode = viewer.getState().interpolationMode;
setInterpolation(mode === 'trilinear' ? 'nearestNeighbor' : 'trilinear');

/*--
@title Change tool
You can change the active tool.
Associated toolbar (if any) will be automatically updated.
--*/

viewer.setActiveTool(rs.toolFactory('hand'));

/*--
@title Add corner text annotation
Corner text annotation shows useful text at the corners of the viewer.
--*/

const comp = viewer.getComposition();
const cornerText = new rs.CornerText();
comp.addAnnotation(cornerText);

// You need to manually re-render the viewer
viewer.render();

/*--
@title Apply orthogonal MPR
Resets the view state to one of the orthogonal MPR slice.
--*/

function mpr(orientation, position) {
  const state = viewer.getState();
  const mmDim = viewer.getComposition().imageSource.mmDim();
  state.section = rs.createOrthogonalMprSection(
    viewer.getResolution(),
    mmDim,
    orientation,
    position
  );
  viewer.setState(state);
}

mpr('sagittal'); // or 'axial', 'coronal'

/*--
@title Set display window
Resets the view state to one of the orthogonal MPR slice.
--*/

const viewState = viewer.getState();
viewState.window = {
  width: 250,
  level: 10
};
viewer.setState(viewState);

/*--
@title AddCloudAnnotation
@hidden
--*/

const comp = viewer.getComposition();

function addCloudAnnotation({
  origin = [10, 10, 10],
  size = [64, 64, 64],
  color = '#ff0000',
  alpha = 0.5,
  debugPoint = false
} = {}) {
  const cloud = new rs.VoxelCloud();
  const volume = new rs.RawData(size, rs.PixelFormat.Binary);
  volume.fillAll(1);
  cloud.volume = volume;
  cloud.origin = origin;
  cloud.color = color;
  cloud.alpha = alpha;
  cloud.debugPoint = debugPoint;
  comp.addAnnotation(cloud);
}

/*--
@title Add cloud annotation
Adds an cloud annotation to the viewer.
--*/

//--@include AddCloudAnnotation

addCloudAnnotation();
comp.annotationUpdated();

/*--
@title Add many cloud annotations
This example adds many cloud annotations.
--*/

//--@include AddCloudAnnotation

const [rx, ry, rz] = comp.imageSource.metadata.voxelCount; // number of voxels

for (let x = 0; x < 10; x++) {
  for (let y = 0; y < 10; y++) {
    addCloudAnnotation({
      origin: [Math.floor((x * rx) / 10), Math.floor((y * ry) / 10), 0],
      size: [Math.floor(rx * 0.08), Math.floor(rx * 0.08), rz],
      color: (x + y) % 2 ? '#ff0000' : '#00ff00'
    });
  }
}

viewer.renderAnnotations();
comp.annotationUpdated();

/*--
@title Add PlaneFigure Annotation
--*/

const fig = new rs.PlaneFigure();
fig.color = '#ff0000';
fig.type = 'circle';
fig.width = 3;
fig.min = [10, 10];
fig.max = [100, 100];

const comp = viewer.getComposition();
comp.addAnnotation(fig);
viewer.renderAnnotations();
comp.annotationUpdated();

/*--
@title Benchmark of ImageSource
This example directly invokes various types of ImageSource and sees their performance.
--*/

const cfg = { seriesUid, client: new rs.RsHttpClient(config.server) };

const dynSrc = new rs.DynamicImageSource(cfg);
const volSrc = new rs.RawVolumeImageSource(cfg);

console.log('Waiting for ready state...');
Promise.all([dynSrc.ready(), volSrc.ready()])
  .then(() => {
    return benchmark(dynSrc);
  })
  .then(() => {
    return benchmark(volSrc);
  });

function benchmark(src) {
  const iteration = 100;
  let count = 0;

  const vs = {
    window: { width: 100, level: 0 },
    section: {
      origin: [0, 0, 100],
      xAxis: [512, 0, 0],
      yAxis: [0, 512, 0]
    }
  };

  console.log(`Measuring ${src.constructor.name}...`);
  const start = performance.now();

  function loop() {
    return src.draw(viewer, vs).then(() => {
      count++;
      if (count < iteration) return loop();
      else {
        return (time = performance.now() - start);
      }
    });
  }

  return loop().then(time => {
    const fps = (1000 / time) * iteration;
    console.log(
      `${
        src.constructor.name
      } took ${time} ms for ${iteration} iterations (${fps} fps)`
    );
    return time;
  });
}
/*--
@title Volume rendering common
@hidden
--*/
const transferFunctionSample = {
  vessel: [
    { position: 0.0 / 65536.0, color: '#00000000' },
    { position: 0.1 / 65536.0, color: '#ff0000ff' },
    { position: 1.5 / 65536.0, color: '#ff0000ff' },
    { position: 65536.0 / 65536.0, color: '#ff0000ff' }
  ],
  masked: [
    // upper range [0;32767] is not hilited pixels
    { position: 0.0 / 65536.0, color: '#00000000' },
    { position: 336.0 / 65536.0, color: '#00000000' },
    { position: 336.1 / 65536.0, color: '#660000ff' },
    { position: 658.0 / 65536.0, color: '#ff0000ff' },
    { position: 32767.9 / 65536.0, color: '#000000ff' },
    // under range [32768;65536] is hilited pixels
    // But if interpolationMode is "vr-mask-custom", not used.
    { position: (0.0 + 32768.0) / 65536.0, color: '#00000000' },
    { position: (336.0 + 32768.0) / 65536.0, color: '#00000000' },
    { position: (336.1 + 32768.0) / 65536.0, color: '#666600ff' },
    { position: (658.0 + 32768.0) / 65536.0, color: '#ff6600ff' },
    { position: (32768.0 + 32768.0) / 65536.0, color: '#000000ff' }
  ]
};

function viewStateAnimation(viewer, state0, state1, totalTime) {
  viewer.setState(state0);

  const animate = () => {
    let originFrameTime = null;
    // let prevFrameTime = null;

    const draw = frameTime => {
      if (!originFrameTime) originFrameTime = frameTime;

      const progress = Math.min(1.0, (frameTime - originFrameTime) / totalTime);
      // prevFrameTime = frameTime;

      const state = viewer.getState();

      if (state1.subVolume) {
        const subVolume = { ...state.subVolume };
        const sv0 = state0.subVolume;
        const sv1 = state1.subVolume;

        if (state1.subVolume.offset)
          subVolume.offset = [
            sv0.offset[0] + (sv1.offset[0] - sv0.offset[0]) * progress,
            sv0.offset[1] + (sv1.offset[1] - sv0.offset[1]) * progress,
            sv0.offset[2] + (sv1.offset[2] - sv0.offset[2]) * progress
          ];
        if (state1.subVolume.dimension)
          subVolume.dimension = [
            sv0.dimension[0] + (sv1.dimension[0] - sv0.dimension[0]) * progress,
            sv0.dimension[1] + (sv1.dimension[1] - sv0.dimension[1]) * progress,
            sv0.dimension[2] + (sv1.dimension[2] - sv0.dimension[2]) * progress
          ];
        state.subVolume = subVolume;
      }

      if (state1.zoom)
        state.zoom = state0.zoom + (state1.zoom - state0.zoom) * progress;

      if (state1.rayIntensityCoef)
        state.rayIntensityCoef =
          state0.rayIntensityCoef +
          (state1.rayIntensityCoef - state0.rayIntensityCoef) * progress;

      viewer.setState(state);

      if (progress < 1.0) window.requestAnimationFrame(draw);
    };

    window.requestAnimationFrame(draw);
  };

  if (totalTime > 0) animate();
}

const imageSource = new rs.VolumeRenderingImageSource({ volumeLoader });

// Prepare composition.
const comp = new rs.Composition(imageSource);

// Initialize viewer
const div = document.getElementById('viewer');
viewer = new rs.Viewer(div);
viewer.setComposition(comp);

// Initialize toolbar
const container = document.getElementById('toolbar');
container.innerHTML = ''; // Clear existing tool bar

const toolbar = rs.createToolbar(container, ['hand', 'celestialRotate']);

if (viewer) {
  toolbar.bindViewer(viewer);
  viewer.setActiveTool('celestialRotate');
}

/*--
@title VR w/WebGL(1) ボリュームデータとマスクデータを合成して描画
@color #ffffdd
@viewerNotRequired

特殊なインターポレーション(vr-mask-custom)を使用しています。
Change interpolation mode を使用して、表示の変化を確認して下さい。
--*/

const cache = new rs.IndexedDbVolumeCache();

// prepare volume loader
const rsHttpClient = new rs.RsHttpClient(config.server);
const mainVolumeLoader = new rs.RsVolumeLoader({
  seriesUid: config.seriesUid,
  rsHttpClient,
  cache
});

// prepare mask loader
const maskHost =
  window.location.protocol +
  '//' +
  window.location.hostname +
  '' +
  (window.location.port && window.location.port != 80
    ? ':' + window.location.port
    : '');
const maskLoadPath = 'sampledata/combined2.raw';

const maskLoader = new rs.VesselSampleLoader({
  path: maskLoadPath,
  rsHttpClient,
  cache
});

// wrap loaders
const volumeLoader = new rs.MixVolumeLoader({ mainLoader, maskLoader });

//--@include Volume rendering common

imageSource.ready().then(() => {
  const state0 = viewer.getState();
  state0.transferFunction = transferFunctionSample.masked;
  state0.horizontal = -64.6;
  state0.vertical = -58;
  state0.zoom = 8;
  state0.interpolationMode = 'vr-mask-custom';

  viewer.setState(state0);
});

/*--
@title VR w/WebGL(2) MRA画像からのボリュームレンダリングとアニメーション
@color #ffffdd
@viewerNotRequired

MRAを直接使用しています。
--*/

const rsHttpClient = new rs.RsHttpClient(config.server);
const volumeLoader = new rs.RsVolumeLoader({
  seriesUid: config.seriesUid,
  rsHttpClient,
  cache: new rs.IndexedDbVolumeCache()
});

//--@include Volume rendering common

imageSource.ready().then(() => {
  const state0 = viewer.getState();
  state0.transferFunction = transferFunctionSample.masked;
  // state0.interpolationMode = 'trilinear';

  state0.subVolume = {
    offset: [0, 0, 0],
    dimension: [512, 512, 132]
  };
  state0.zoom = 1.0;
  state0.rayIntensityCoef = 1.0;
  // state0.target = [112, 120, 39.6];

  const state1 = {};
  state1.subVolume = {
    offset: [290, 180, 32],
    dimension: [50, 50, 100]
  };
  state1.zoom = 13.6;
  // state1.rayIntensityCoef = 0.2;

  viewStateAnimation(viewer, state0, state1, 16000);
});

/*--
@title VR w/WebGL(3) マスク用データからの直接描画
@color #ffffdd
@viewerNotRequired

sampledata/vessel_mask.raw を使用しています。
--*/

const sampleHost =
  window.location.protocol +
  '//' +
  window.location.hostname +
  '' +
  (window.location.port && window.location.port != 80
    ? ':' + window.location.port
    : '');
const samplePath = 'sampledata/vessel_mask.raw';

const volumeLoader = new rs.VesselSampleLoader({
  host: sampleHost,
  path: samplePath,
  coef: 65536 * 0.5
});

//--@include Volume rendering common

imageSource.ready().then(() => {
  const state0 = viewer.getState();
  state0.transferFunction = [
    { position: 0.0 / 65536.0, color: '#00000000' },
    { position: 32728.0 / 65536.0, color: '#880000ff' },
    { position: 65536.0 / 65536.0, color: '#88ff00ff' }
  ];
  viewer.setState(state0);
});

/*--
@title VR w/WebGL(4) モックを使用した描画
@color #ffffdd
@viewerNotRequired

モック
--*/

const volumeLoader = new rs.MockVolumeLoader();

//--@include Volume rendering common

imageSource.ready().then(() => {
  const state0 = viewer.getState();
  state0.transferFunction = [
    { position: 0.0 / 65536.0, color: '#00000000' },
    { position: 40.0 / 65536.0, color: '#00ffffff' },
    { position: 65536.0 / 65536.0, color: '#00ffffff' }
  ];
  viewer.setState(state0);
});

/*--
@title Hide viewer 2
--*/
const div2 = document.getElementById('viewer2');
div2.parentNode.removeChild(div2);

/*--
@title Resize animation functions
@hidden
--*/
function resizeAnimation(totalTime, f) {
  if (totalTime > 0) {
    let originFrameTime = null;

    const draw = frameTime => {
      if (!originFrameTime) originFrameTime = frameTime;
      const progress = Math.min(1.0, (frameTime - originFrameTime) / totalTime);
      f(progress);
      if (progress < 1.0) window.requestAnimationFrame(draw);
    };
    window.requestAnimationFrame(draw);
  }
}

function resizeTicks(totalTime, tick, f) {
  if (totalTime > 0) {
    let originFrameTime = null;

    const draw = () => {
      let frameTime = new Date().getTime();
      if (!originFrameTime) originFrameTime = frameTime;
      const progress = Math.min(1.0, (frameTime - originFrameTime) / totalTime);
      f(progress);
      if (progress < 1.0) setTimeout(draw, tick);
    };
    draw();
  }
}

/*--
@title Resize wrapper element with requestAnimationFrame
--*/

//--@include Resize animation functions
const div1 = document.getElementById('viewer');

resizeAnimation(4000, function(progress) {
  div1.style.width =
    Math.floor(312 + 200 * Math.cos(2 * Math.PI * progress)).toString() + 'px';
  div1.style.height =
    Math.floor(312 + 200 * Math.cos(2 * Math.PI * progress)).toString() + 'px';
});

/*--
@title Resize wrapper element with setTimeout 200[ms]
--*/

//--@include Resize animation functions
const div1 = document.getElementById('viewer');

resizeTicks(4000, 200, function(progress) {
  div1.style.width =
    Math.floor(312 + 200 * Math.cos(2 * Math.PI * progress)).toString() + 'px';
  div1.style.height =
    Math.floor(312 + 200 * Math.cos(2 * Math.PI * progress)).toString() + 'px';
});
