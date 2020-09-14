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

const referenceLine1 = new rs.ReferenceLine(viewer, { color: '#993300' });
const referenceLine2 = new rs.ReferenceLine(viewer2, { color: '#3399ff' });
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

const scrollbar = new rs.Scrollbar(viewer, {
  position: 'right',
  color: '#993300'
});
comp.addAnnotation(scrollbar);

const scrollbar2 = new rs.Scrollbar(viewer2, {
  position: 'left',
  color: '#339900'
});
comp.addAnnotation(scrollbar2);

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
  'rectangle',
  'point',
  'ellipsoid',
  'cuboid'
]);

if (viewer) toolbar.bindViewer(viewer);
if (viewer2) toolbar.bindViewer(viewer2);
const scrollbar = new rs.Scrollbar(viewer, {
  position: 'top',
  visibility: 'hover',
  visibilityThreshold: 50,
  marginHorizontal: 10,
  marginVertical: 5,
  size: 30
});
scrollbar.drawVisibilityThreshold = true;
comp.addAnnotation(scrollbar);
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
@title Add Point Annotation
--*/

const point = new rs.Point();
const viewState = viewer.getState();
const s = viewState.section;
point.x = s.origin[0] + s.xAxis[0] / 2 + s.yAxis[0] / 2;
point.y = s.origin[1] + s.xAxis[1] / 2 + s.yAxis[1] / 2;
point.z = s.origin[2] + s.xAxis[2] / 2 + s.yAxis[2] / 2;

const comp = viewer.getComposition();
comp.addAnnotation(point);
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
comp.annotationUpdated();

/*--
@title Add SolidFigure Cuboid Annotation
--*/

const fig = new rs.Cuboid();
fig.editable = true;
fig.color = '#ff0000';
fig.width = 2;
// fig.fillColor = 'rgba(102, 205, 170, 0.3)'; // #66cdaa mediumaquamarine
fig.min = [90, 150, 70];
fig.max = [300, 250, 280];
fig.boundingBoxOutline = { width: 1, color: 'rgba(255,255,255,0.3)' };
fig.boundingBoxCrossHair = { width: 2, color: 'rgba(255,255,255,0.8)' };

const comp = viewer.getComposition();
comp.addAnnotation(fig);
comp.annotationUpdated();

/*--
@title Add SolidFigure Ellipsoid Annotation
--*/

const fig = new rs.Ellipsoid();
fig.editable = true;
fig.color = '#ff0000';
fig.width = 2;
fig.fillColor = 'rgba(102, 205, 170, 0.3)'; // #66cdaa mediumaquamarine
fig.min = [90, 150, 70];
fig.max = [300, 250, 280];
fig.boundingBoxOutline = { width: 1, color: 'rgba(255,255,255,0.3)' };
fig.boundingBoxCrossHair = { width: 2, color: 'rgba(255,255,255,0.8)' };
fig.boundingBoxCrossSectionalShape = { width: 1, color: '#ff00ff' };

const comp = viewer.getComposition();
comp.addAnnotation(fig);
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
      `${src.constructor.name} took ${time} ms for ${iteration} iterations (${fps} fps)`
    );
    return time;
  });
}

/*--
@title VR common
@hidden
--*/

// Initialize viewer.
const viewer = new rs.Viewer(document.getElementById('viewer'));
const tool = new rs.toolFactory('celestialRotate');
viewer.setActiveTool(tool);

// Hide right viewer.
const div2 = document.getElementById('viewer2');
div2.style.display = 'none';
const vrControl =
  document.querySelector('#vr-controls') || document.createElement('div');
vrControl.setAttribute('id', 'vr-controls');
$(vrControl).children().remove();
div2.parentNode.appendChild(vrControl);

// Setup volume loader
const rsHttpClient = new rs.RsHttpClient(config.server);
const cache = new rs.IndexedDbVolumeCache();
const volumeLoader = new rs.RsVolumeLoader({
  rsHttpClient,
  seriesUid: config.seriesUid,
  partialVolumeDescriptor: toPartialVolumeDescriptor(
    config.partialVolumeDescriptor
  ),
  cache
});

// Create transfer function (ex. extracting blood vessels)
const vesselTransferFunction = rs.createTransferFunction([
  [470, '#66000000'],
  [700, '#ff0000ff']
]);

/*--
@title Prepare demo client
@hidden
--*/

const demoHost =
  window.location.protocol +
  '//' +
  window.location.hostname +
  '' +
  (window.location.port && window.location.port !== '80'
    ? ':' + window.location.port
    : '');
const demoHttpClient = new rs.RsHttpClient(demoHost);

/*--
@title VR
@color #ffffdd
@viewerNotRequired
--*/

//--@include VR common

// Initialize image source
const vrImageSource = new rs.VolumeRenderingImageSource({ volumeLoader });
const comp = new rs.Composition(vrImageSource);
viewer.setComposition(comp);

// Activate external sample utilities.
vrImageSource.ready().then(() => {
  const { transferFunction: defaultTransferFunction } = viewer.getState();

  // Some functions which changes view state.
  let enableBloodVesselsExtraction = false;
  const toggleTransferFunction = () =>
    viewer.setState({
      ...viewer.getState(),
      transferFunction: (enableBloodVesselsExtraction = !enableBloodVesselsExtraction)
        ? vesselTransferFunction
        : defaultTransferFunction
    });

  let enableInterporation = false;
  const toggleInterporation = () =>
    viewer.setState({
      ...viewer.getState(),
      interpolationMode: (enableInterporation = !enableInterporation)
        ? 'trilinear'
        : 'nearestNeighbor'
    });

  const appendVrControlButton = (title, fn) => {
    $(vrControl).append(
      $(document.createElement('button'))
        .addClass('btn btn-sm btn-block btn-default')
        .css({ textAlign: 'left' })
        .on('click', fn)
        .append(title)
    );
  };

  appendVrControlButton(
    'Toggle transfer function (which extracts blood vessels)',
    toggleTransferFunction
  );

  appendVrControlButton(
    'Toggle (trilinear) interporation enabled',
    toggleInterporation
  );
});

/*--
@title VR with mask and label
@color #ffffdd
@viewerNotRequired
--*/

//--@include VR common

//--@include Prepare demo client

// Prepare label loader
const labelLoader = new rs.CsLabelLoader({
  rsHttpClient: demoHttpClient,
  basePath: 'sampledata'
  // demo/sampledata/candidates.json
  // demo/sampledata/cand1.raw
  // demo/sampledata/cand2.raw
  // demo/sampledata/cand3.raw
});

// Prepare mask loader
const maskLoader = new rs.VesselSampleLoader({
  host: demoHost,
  path: 'sampledata/vessel_mask.raw'
  // demo/sampledata/vessel_mask.raw
});

// Initialize image source
const vrImageSource = new rs.VolumeRenderingImageSource({
  volumeLoader,
  labelLoader,
  maskLoader
});
const comp = new rs.Composition(vrImageSource);
viewer.setComposition(comp);

vrImageSource.ready().then(() => {
  const defaultState = viewer.getState();
  let highlightedLabelIndex = 0;
  viewer.setState({
    ...defaultState,
    transferFunction: vesselTransferFunction,
    interpolationMode: 'trilinear',
    highlightedLabelIndex
  });

  let enableInterporation = false;
  const toggleInterporation = () =>
    viewer.setState({
      ...viewer.getState(),
      interpolationMode: (enableInterporation = !enableInterporation)
        ? 'trilinear'
        : 'nearestNeighbor'
    });

  const toggleHighlightedLabelIndex = () =>
    viewer.setState({
      ...viewer.getState(),
      highlightedLabelIndex: (highlightedLabelIndex =
        ++highlightedLabelIndex % 3)
    });

  const disableLabelHighlight = () =>
    viewer.setState({
      ...viewer.getState(),
      highlightedLabelIndex: undefined
    });

  let enableMask = false;
  const toggleMaskEnabled = () =>
    viewer.setState({
      ...viewer.getState(),
      enableMask: (enableMask = !enableMask)
    });

  const appendVrControlButton = (title, fn) => {
    $(vrControl).append(
      $(document.createElement('button'))
        .addClass('btn btn-sm btn-block btn-default')
        .css({ textAlign: 'left' })
        .on('click', fn)
        .append(title)
    );
  };

  appendVrControlButton(
    'Toggle (trilinear) interporation enabled',
    toggleInterporation
  );
  appendVrControlButton(
    'Change highlighted label',
    toggleHighlightedLabelIndex
  );
  appendVrControlButton('Disable label highlight', disableLabelHighlight);

  appendVrControlButton('Toggle mask enabled', toggleMaskEnabled);
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

resizeAnimation(4000, function (progress) {
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

resizeTicks(4000, 200, function (progress) {
  div1.style.width =
    Math.floor(312 + 200 * Math.cos(2 * Math.PI * progress)).toString() + 'px';
  div1.style.height =
    Math.floor(312 + 200 * Math.cos(2 * Math.PI * progress)).toString() + 'px';
});
