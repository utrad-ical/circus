import { Composition, createOrthogonalMprSection, createToolbar, DynamicMprImageSource, HybridMprImageSource, MprViewState, RawVolumeMprImageSource, RsHttpClient, RsVolumeLoader, Viewer } from "browser";
import { PartialVolumeDescriptor } from "@utrad-ical/circus-lib";
import RsProgressiveVolumeLoader from "browser/image-source/volume-loader/RsProgressiveVolumeLoader";
import WebSocketClient from "browser/ws/WebSocketClient";
import { createTransferClientFactory } from "browser/ws/createTransferClientFactory";

type Config = Exclude<ReturnType<typeof restoreConfig>, null>;
const cfg = restoreConfig();

document.addEventListener('DOMContentLoaded', function (e) {
    console.log(cfg);

    if (cfg) {
        main(cfg);
    } else {
        alert('No Configration');
    }
});

function restoreConfig() {
    const cfgJson = localStorage.getItem('rs-demo-save') || 'null';
    const cfg = JSON.parse(cfgJson);
    return cfg
        ? {
            seriesUid: cfg.seriesUid,
            partialVolumeDescriptor: cfg.partialVolumeDescriptor,
            server: cfg.server.replace(/^.*\/\/(.*)$/, '$1')
        }
        : null;
}

async function main(cfg: Config) {
    const apiHost = `http://${cfg.server}`;
    const apiClient = new RsHttpClient(apiHost);

    const wsHost = `ws://${cfg.server}`;
    const wsClient = new WebSocketClient(`${wsHost}/ws/volume`);
    const factory = createTransferClientFactory(wsClient);

    const seriesUid = cfg.seriesUid;
    const partialVolumeDescriptor = toPartialVolumeDescriptor(
        cfg.partialVolumeDescriptor
    );

    const volumeLoader = new RsProgressiveVolumeLoader({
        seriesUid,
        partialVolumeDescriptor,
        rsHttpClient: apiClient,
        transferClientFactory: factory
    });

    const imageSource = new RawVolumeMprImageSource({ volumeLoader });
    // const imageSource = new DynamicMprImageSource({ rsHttpClient: apiClient, seriesUid, partialVolumeDescriptor });

    const comp = new Composition(imageSource);

    const div = document.getElementById('viewer')! as HTMLDivElement;
    const viewer = new Viewer(div);
    viewer.setComposition(comp);

    const setOrientation = async (v: Viewer, orientation: any) => {
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
    setOrientation(viewer, 'coronal');

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
    toolbar.bindViewer(viewer);

    let rendered: number = 0;
    volumeLoader.addProgressListener('progress', ({ count, total }) => {
        const t = new Date().getTime();
        console.log({ count, total, rendered, t, r: t - rendered });
        if ((count === total) || (300 < (t - rendered))) {
            viewer.render();
            rendered = t;
        }
    });
}

function toPartialVolumeDescriptor(str: string): PartialVolumeDescriptor | undefined {
    const [start, end, delta] = str.split(':').map(value => {
        const num = parseInt(value, 10);
        return isNaN(num) ? undefined : num;
    });

    if (start === undefined && end === undefined && delta === undefined) {
        return undefined;
    } else if (start !== undefined && end !== undefined) {
        return { start, end, delta: delta || 1 };
    } else {
        throw new Error(
            'Invalid partial volume descriptor specified. ' +
            'partial volume descriptor must be in the form of `startImgNum:endImgNum(:imageDelta)`'
        );
    }
}
