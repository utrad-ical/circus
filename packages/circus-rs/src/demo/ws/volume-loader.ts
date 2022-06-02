import { Composition, createOrthogonalMprSection, createToolbar, MprViewState, RawVolumeMprImageSource, ReferenceLine, RsHttpClient, Viewer } from "browser";
import RsProgressiveVolumeLoader from "browser/image-source/volume-loader/RsProgressiveVolumeLoader";
import WebSocketClient from "browser/ws/WebSocketClient";
import { createTransferClientFactory } from "browser/ws/createTransferClientFactory";
import setting, { VolumeSetting } from './setting';

document.addEventListener('DOMContentLoaded', function (e) {

    const toolbar = setupToolbar();

    for (let i = 0; i < setting.count(); i++) {
        const cfg = setting.get(i);
        const comp = setupComposition(cfg);
        const setOrientation = createOrientationSetter(comp);

        const axial = setupViewer();
        axial.setComposition(comp);
        setOrientation(axial, 'axial');
        toolbar.bindViewer(axial);

        const coronal = setupViewer();
        coronal.setComposition(comp);
        setOrientation(coronal, 'coronal');
        toolbar.bindViewer(coronal);

        const saggital = setupViewer();
        saggital.setComposition(comp);
        setOrientation(saggital, 'sagittal');
        toolbar.bindViewer(saggital);

        const axialLine = new ReferenceLine(axial, { color: '#993300' });
        const coronalLine = new ReferenceLine(coronal, { color: '#3399ff' });
        const saggitalLine = new ReferenceLine(saggital, { color: '#33ff33' });
        comp.addAnnotation(axialLine);
        comp.addAnnotation(coronalLine);
        comp.addAnnotation(saggitalLine);

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

function setupComposition({ server, seriesUid, partialVolumeDescriptor }: VolumeSetting) {
    const host = server.replace(/^.*\/\/(.*)$/, '$1');

    const apiClient = new RsHttpClient(`http://${host}`);
    const wsClient = new WebSocketClient(`ws://${host}/ws/volume`);
    const factory = createTransferClientFactory(wsClient);

    const volumeLoader = new RsProgressiveVolumeLoader({
        seriesUid,
        partialVolumeDescriptor,
        rsHttpClient: apiClient,
        transferClientFactory: factory
    });

    const imageSource = new RawVolumeMprImageSource({ volumeLoader });
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
    v.setState(newState);
};

function setupViewer() {
    const container = document.getElementById('viewer-container') as HTMLDivElement;
    const div = document.createElement('div');
    container.append(div);
    const viewer = new Viewer(div);

    return viewer;
}
