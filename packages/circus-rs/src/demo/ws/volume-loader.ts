import { Composition, createOrthogonalMprSection, createToolbar, MprViewState, RawVolumeMprImageSource, ReferenceLine, RsHttpClient, Viewer, WebGlRawVolumeMprImageSource } from "browser";
import RsProgressiveVolumeLoader from "../../browser/image-source/volume-loader/RsProgressiveVolumeLoader";
import WebSocketClient from "../../browser/ws/WebSocketClient";
import { createTransferConnectionFactory } from "../../browser/ws/createTransferConnectionFactory";
import setting, { toPartialVolumeDescriptor, VolumeSetting } from './setting';

document.addEventListener('DOMContentLoaded', function (e) {

    const toolbar = setupToolbar();

    const viewerInitializer = (comp: Composition) => {
        const setOrientation = createOrientationSetter(comp);

        return (orientation: string, color: string) => {
            const viewer = setupViewer();
            viewer.setComposition(comp);
            setOrientation(viewer, orientation);
            toolbar.bindViewer(viewer);
            const viewerLine = new ReferenceLine(viewer, { color });
            comp.addAnnotation(viewerLine);
            return viewer;
        };
    }

    for (let i = 0; i < setting.count(); i++) {
        const cfg = setting.get(i);
        const comp = setupComposition(cfg);
        const initializeViewer = viewerInitializer(comp);

        // initializeViewer('axial', '#993300');
        initializeViewer('coronal', '#3399ff');
        // initializeViewer('sagittal', '#33ff33');

        comp.viewers.forEach(viewer => viewer.render());
    }
});

const setupToolbar = () => {
    const toolbarContainer = document.getElementById('toolbar')!;
    const toolbar = createToolbar(toolbarContainer, [
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
    return toolbar;
}

function setupComposition({ server, seriesUid, partialVolumeDescriptor: partial }: VolumeSetting) {
    const host = server.replace(/^.*\/\/(.*)$/, '$1');

    const apiClient = new RsHttpClient(`http://${host}`);
    const wsClient = new WebSocketClient(`ws://${host}/ws/volume`);
    const transferConnectionFactory = createTransferConnectionFactory(wsClient);

    const partialVolumeDescriptor = toPartialVolumeDescriptor(partial);
    const volumeLoader = new RsProgressiveVolumeLoader({
        seriesUid,
        partialVolumeDescriptor,
        rsHttpClient: apiClient,
        transferConnectionFactory
    });

    // const imageSource = new RawVolumeMprImageSource({ volumeLoader });
    const imageSource = new WebGlRawVolumeMprImageSource({ volumeLoader });
    // volumeLoader.setPriority('13-26', 100);

    // const imageSource = new DynamicMprImageSource({ rsHttpClient: apiClient, seriesUid, partialVolumeDescriptor });

    const comp = new Composition(imageSource);

    return comp;
}

const createOrientationSetter = (comp: Composition) => async (v: Viewer, orientation: any) => {
    const imageSource = comp.imageSource as RawVolumeMprImageSource;
    await imageSource.ready();

    const section = createOrthogonalMprSection(
        v.getResolution(),
        imageSource.mmDim(),
        orientation
    );

    const newState = { ...v.getState(), section } as MprViewState;
    v.setState({ ...newState, interpolationMode: 'nearestNeighbor' });
};

function setupViewer() {
    const container = document.getElementById('viewer-container') as HTMLDivElement;
    const div = document.createElement('div');
    container.append(div);
    const viewer = new Viewer(div);

    return viewer;
}
