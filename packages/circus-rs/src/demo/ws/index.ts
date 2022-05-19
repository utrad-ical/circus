import { RsHttpClient } from "browser";
import { dummyVolume } from "ws-temporary-config";
import { createTransferClientFactory, TransferClientFactory } from "../../browser/ws/createTransferClientFactory";
import DebugLogger from "./DebugLogger";
import WebSocketClient from "../../browser/ws/WebSocketClient";
import drawToImageData from "../../browser/image-source/drawToImageData";
import { pixelFormatInfo } from '@utrad-ical/circus-lib/src/PixelFormat';

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

function main(cfg: Config) {
    const wsHost = `ws://${cfg.server}`;
    const apiHost = `http://${cfg.server}`;

    const el = document.querySelector('#test-container') as HTMLElement;
    if (!el) return;

    const logConsole = el.querySelector('[data-role=log-console]') as HTMLElement;
    const logger = new DebugLogger(logConsole);

    const apiClient = new RsHttpClient(apiHost);

    const wsClient = new WebSocketClient(`${wsHost}/ws/volume`);
    const factory = createTransferClientFactory(wsClient);

    // Hello
    const helloButton = el.querySelector('[data-role=hello-button]') as HTMLElement | undefined;
    helloButton?.addEventListener('click', async function (e) {
        const ws = new WebSocket(`${wsHost}/ws/hello`);
        ws.addEventListener('open', () => logger.info('open'));
        ws.addEventListener('message', ({ data }) => logger.info(data));
        ws.addEventListener('close', () => logger.info('close'));
        ws.addEventListener('error', () => logger.error('error'));
    });

    // Create
    const createButton = el.querySelector('[data-role=create-button]') as HTMLElement | undefined;
    createButton?.addEventListener('click', function (e) {
        handleClickCreateButton(apiClient, logger, factory);
    });

    // Disconnect
    const closeButton = el.querySelector('[data-role=close-button]') as HTMLElement | undefined;
    closeButton?.addEventListener('click', function (e) {
        wsClient.dispose();
    });

    // Clear logs
    const clearLogButton = el.querySelector('[data-role=clear-log-button]') as HTMLElement | undefined;
    clearLogButton?.addEventListener('click', function (e) {
        logger.shutdown();
    });

    // Start all
    const startAllButton = el.querySelector('[data-role=start-all-button]') as HTMLElement | undefined;
    startAllButton?.addEventListener('click', function (e) {
        [].forEach.call(
            document.querySelectorAll('[data-role=start-button]'),
            (btn: HTMLButtonElement) => btn.click()
        );
    });
}

// interface MetadataResponse {
//     voxelCount: [number, number, number];
//     voxelSize: [number, number, number];
//     dicomWindow?: ViewWindow;
//     pixelFormat: PixelFormat;
//     mode: '3d' | '2d';
//     estimatedWindow?: ViewWindow;
// }

async function handleClickCreateButton(apiClient: RsHttpClient, logger: DebugLogger, factory: TransferClientFactory) {

    const { seriesUid } = dummyVolume;
    const metadata = await apiClient.request(`series/${seriesUid}/metadata`, {});
    const { arrayClass } = pixelFormatInfo(metadata.pixelFormat);

    const setPriorityTargets = [
        Math.trunc(Math.random() * metadata.voxelCount[2]),
        Math.trunc(Math.random() * metadata.voxelCount[2]),
        Math.trunc(Math.random() * metadata.voxelCount[2])
    ];

    const loaderElement = document.createElement('div');
    const loadCounter = new Map<number, number>();

    const handler = (imageNo: number, buffer: ArrayBuffer) => {
        if (loadCounter.has(imageNo)) {
            loadCounter.set(imageNo, loadCounter.get(imageNo)! + 1);
        } else {
            loadCounter.set(imageNo, 1);
        }

        const indicator = loaderElement.querySelector('canvas[data-role=load-indicator]') as HTMLCanvasElement | undefined;
        if (indicator) {
            const ctx = indicator.getContext('2d')!;
            switch (loadCounter.get(imageNo)!) {
                case 1:
                    ctx.fillStyle = 'rgba(0,0,255,1.0)';
                    break;
                case 2:
                    ctx.fillStyle = 'rgba(0,255,0,1.0)';
                    break;
                default:
                    ctx.fillStyle = 'rgba(255,0,0,1.0)';
                    break;
            }
            ctx.fillRect(imageNo - 1, 0, 1, 50);
        }

        // show preview image in canvas
        const [w, h] = metadata.voxelCount;
        const typedBuffer = new arrayClass(buffer);
        const imageData = drawToImageData([w, h], typedBuffer, metadata.dicomWindow);
        const preview = loaderElement.querySelector('canvas[data-role=load-preview]') as HTMLCanvasElement | undefined;
        if (preview) preview.getContext('2d')!.putImageData(imageData, 0, 0);

        if (loadCounter.size === metadata.voxelCount[2]) {
            logger.info(`#${transferClient.id()} Completed in ${new Date().getTime() - startTime} [ms]`);
        }
    }

    const transferClient = await factory.make({ seriesUid }, handler);

    let startTime = -1;

    const onClickStartButton = () => {
        startTime = new Date().getTime();
        logger.info(`#${transferClient.id()} beginTransfer`);
        transferClient.beginTransfer();
    };

    const onClickChangePriorityButton = () => {
        logger.info(`#${transferClient.id()} setPriority`);
        transferClient.setPriority(setPriorityTargets, 10);
    };

    const onClickStopButton = () => {
        logger.info(`#${transferClient.id()} stopTransfer`);
        transferClient.stopTransfer();
    };

    const onClickDisposeButton = () => {
        logger.info(`#${transferClient.id()} stopTransfer`);
        transferClient.stopTransfer();
        loaderElement.remove();
    };

    // id
    const titleSpan = document.createElement('span');
    titleSpan.classList.add('mr-2');
    titleSpan.innerText = transferClient.id();
    loaderElement.append(titleSpan);

    // Start
    const startButton = document.createElement('button');
    startButton.setAttribute('data-role', 'start-button');
    startButton.classList.add('btn', 'btn-sm', 'btn-secondary', 'mr-2');
    startButton.innerText = 'Start';
    startButton.addEventListener('click', onClickStartButton);
    loaderElement.append(startButton);

    // ChangePriority
    const changePriorityButton = document.createElement('button');
    changePriorityButton.classList.add('btn', 'btn-sm', 'btn-secondary', 'mr-2');
    changePriorityButton.innerText = 'Change Priority ' + setPriorityTargets.toString();
    changePriorityButton.addEventListener('click', onClickChangePriorityButton);
    loaderElement.append(changePriorityButton);

    // Stop
    const stopButton = document.createElement('button');
    stopButton.classList.add('btn', 'btn-sm', 'btn-secondary', 'mr-2');
    stopButton.innerText = 'Stop';
    stopButton.addEventListener('click', onClickStopButton);
    loaderElement.append(stopButton);

    // Dispose
    const disposeButton = document.createElement('button');
    disposeButton.classList.add('btn', 'btn-sm', 'btn-secondary', 'mr-2');
    disposeButton.innerText = 'Dispose';
    disposeButton.addEventListener('click', onClickDisposeButton);
    loaderElement.append(disposeButton);

    // Layout
    const container = document.createElement('div');
    container.classList.add('row', 'no-gutturs');
    loaderElement.append(container);
    const previewContainer = document.createElement('div');
    previewContainer.classList.add('col-2', 'pr-1');
    container.append(previewContainer);
    const indicatorContainer = document.createElement('div');
    indicatorContainer.classList.add('col-10');
    container.append(indicatorContainer);

    // Loading indicator
    const imageCount = metadata.voxelCount[2];
    const indicator = document.createElement('canvas');
    indicator.setAttribute('data-role', 'load-indicator');
    indicator.setAttribute('width', imageCount.toString());
    indicator.setAttribute('height', '50');
    indicator.style.setProperty('margin-top', '0.2rem');
    indicator.style.setProperty('width', '100%');
    indicator.style.setProperty('height', '50px');
    indicator.style.setProperty('border', '1px solid #999999');
    indicatorContainer.append(indicator);

    // Image Viewer
    const [w, h] = metadata.voxelCount;
    const preview = document.createElement('canvas');
    preview.setAttribute('data-role', 'load-preview');
    preview.setAttribute('width', w.toString());
    preview.setAttribute('height', h.toString());
    preview.style.setProperty('width', '100%');
    preview.style.setProperty('height', 'auto');
    preview.style.setProperty('border', '1px solid #999999');
    previewContainer.append(preview);

    const wrapper = document.querySelector('[data-role=loader-container]') as HTMLElement | undefined;
    if (wrapper) wrapper.append(loaderElement);
}


