import { RsHttpClient } from "../../src/browser";
import { createTransferConnectionFactory, TransferConnection, TransferConnectionFactory } from "../../src/browser/ws/createTransferConnectionFactory";
import DebugLogger from "./DebugLogger";
import { WebSocketClientImpl as WebSocketClient } from "../../src/browser/ws/WebSocketClient";
import drawToImageData from "../../src/browser/image-source/drawToImageData";
import { pixelFormatInfo } from '@utrad-ical/circus-lib/src/PixelFormat';
import setting, { toPartialVolumeDescriptor } from './setting';
import { createRequestParams } from "../../src/browser/image-source/volume-loader/rs-loader-utils";

document.addEventListener('DOMContentLoaded', function (e) {
    setup()
});

function setup() {

    if (0 === setting.count()) return;

    const el = document.querySelector('#test-container') as HTMLElement;
    if (!el) return;

    const { server } = setting.get(0);

    const host = server.replace(/^.*\/\/(.*)$/, '$1');
    const wsHost = `ws://${host}`;
    const apiHost = `http://${host}`;

    const apiClient = new RsHttpClient(apiHost);
    const wsClient = new WebSocketClient(`${wsHost}/ws/volume`);
    const beginTransfer = createTransferConnectionFactory(wsClient);

    const logConsole = el.querySelector('[data-role=log-console]') as HTMLElement;
    const logger = new DebugLogger(logConsole);

    const btnContainer = document.querySelector('#button-container') as HTMLDivElement;
    const subBtnContainer = document.querySelector('#sub-button-container') as HTMLDivElement;
    const btn = (label: string, parent: HTMLElement = btnContainer) => {
        const button = document.createElement('button');
        button.classList.add('btn', 'btn-outline-secondary', 'mr-1');
        button.innerText = label;
        parent.append(button);
        return button;
    };

    btn('Hello').addEventListener('click', async function (e) {
        const ws = new WebSocket(`${wsHost}/ws/hello`);
        ws.addEventListener('open', () => logger.info('open'));
        ws.addEventListener('message', ({ data }) => logger.trace(data));
        ws.addEventListener('close', () => logger.info('close'));
        ws.addEventListener('error', () => logger.error('error'));
    });

    btn('bufferAmount').addEventListener('click', function (e) {
        subBtnContainer.innerHTML = '';

        const ws = new WebSocket(`${wsHost}/ws/bufferedAmountCheck`);
        ws.binaryType = 'arraybuffer';

        const request = (count: number, chunkSize: number, waitForBufferToEmpty: boolean) => ws.send(`${count}:${chunkSize}:${waitForBufferToEmpty ? 'wait' : ''}`);
        ws.addEventListener('open', () => {
            logger.info('opened');

            btn('2GBx1 (2GB)/once', subBtnContainer)
                .addEventListener('click', () => request(1, 2 * 1000 * 1000 * 1000, false));
            btn('200MBx10 (2GB)/once', subBtnContainer)
                .addEventListener('click', () => request(10, 200 * 1000 * 1000, false));
            btn('20MBx100 (2GB)/once', subBtnContainer)
                .addEventListener('click', () => request(100, 20 * 1000 * 1000, false));
            btn('2MBx1000 (2GB)/once', subBtnContainer)
                .addEventListener('click', () => request(1000, 2 * 1000 * 1000, false));

            btn('2GBx1 (2GB)/wait', subBtnContainer)
                .addEventListener('click', () => request(1, 2 * 1000 * 1000 * 1000, true));
            btn('200MBx10 (2GB)/wait', subBtnContainer)
                .addEventListener('click', () => request(10, 200 * 1000 * 1000, true));
            btn('20MBx100 (2GB)/wait', subBtnContainer)
                .addEventListener('click', () => request(100, 20 * 1000 * 1000, true));
            btn('2MBx1000 (2GB)/wait', subBtnContainer)
                .addEventListener('click', () => request(1000, 2 * 1000 * 1000, true));

            btn('3GBx1 (3GB)/wait', subBtnContainer)
                .addEventListener('click', () => request(1, 3 * 1000 * 1000 * 1000, true));

            btn('Close', subBtnContainer).addEventListener('click', function (e) {
                ws.close();
            });
        });
        ws.addEventListener('close', () => {
            subBtnContainer.innerHTML = '';
            logger.info('close');
        });
        ws.addEventListener('message', ({ data }) => {
            switch (typeof data) {
                case 'string':
                    logger.trace(data);
                    break;
                default:
                    logger.info(`${(data as ArrayBuffer).byteLength.toLocaleString()} [bytes] accepted`);
            }
        });
        ws.addEventListener('error', () => logger.error('error'));
    });

    btn('ws/volume').addEventListener('click', function (e) {
        subBtnContainer.innerHTML = '';

        for (let i = 0; i < setting.count(); i++) {
            // Create
            btn(`Create#${i}`, subBtnContainer).addEventListener('click', function (e) {
                const { seriesUid, partialVolumeDescriptor } = setting.get(i);
                prepareLoadingProcess(apiClient, logger, beginTransfer, seriesUid, partialVolumeDescriptor);
            });
        }

        btn('Start all at once', subBtnContainer).addEventListener('click', function (e) {
            [].forEach.call(
                document.querySelectorAll('[data-role=start-button]'),
                (btn: HTMLButtonElement) => btn.click()
            );
        });

        btn('Start all sequentially', subBtnContainer).addEventListener('click', async function (e) {
            const triggers = [].map.call(
                document.querySelectorAll('[data-role=start-button]'),
                (btn: HTMLButtonElement) => () => btn.click()
            ) as (() => void)[];

            triggers.reduce(
                (p: Promise<void>, trig) => p.then(() => new Promise<void>((resolve) => {
                    trig();
                    setTimeout(() => resolve(), 100);
                })), Promise.resolve());
        });

        btn('Disconnect', subBtnContainer).addEventListener('click', function (e) {
            wsClient.dispose();
        });

        btn('Clear', subBtnContainer).addEventListener('click', function (e) {
            [].forEach.call(
                document.querySelectorAll('[data-role=dispose-button]'),
                (btn: HTMLButtonElement) => btn.click()
            );
        });
    });

    // Clear logs
    const closeBtn: HTMLButtonElement = document.querySelector('#clear-logs')!;
    closeBtn.addEventListener('click', function (e) {
        logger.shutdown();
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

async function prepareLoadingProcess(
    apiClient: RsHttpClient,
    logger: DebugLogger,
    beginTransfer: TransferConnectionFactory,
    seriesUid: string,
    partialVolumeString?: string
) {

    const metadata = await apiClient.request(
        `series/${seriesUid}/metadata`,
        createRequestParams(
            toPartialVolumeDescriptor(partialVolumeString)
        )
    );
    const { arrayClass } = pixelFormatInfo(metadata.pixelFormat);

    const higherPriorityImages = [
        Math.trunc(Math.random() * metadata.voxelCount[2]),
        Math.trunc(Math.random() * metadata.voxelCount[2]),
        Math.trunc(Math.random() * metadata.voxelCount[2]),
        Math.trunc(Math.random() * metadata.voxelCount[2]),
        Math.trunc(Math.random() * metadata.voxelCount[2]),
    ].sort((a, b) => a === b ? 0 : (a < b) ? -1 : 1); //.filter((v, i, a) => i === a.indexOf(v));

    const loaderElement = document.createElement('div');
    loaderElement.classList.add('list-group-item');
    const stored = new Set<number>();
    let loadedLength = 0;

    const divAt = (parent?: HTMLElement) => {
        const el = document.createElement('div');
        if (parent) parent.append(el);
        return el;
    };

    const imageDataCollection = new Map<number, ImageData>();

    const handler = (imageIndex: number, buffer: ArrayBuffer) => {
        loadedLength += buffer.byteLength;
        stored.add(imageIndex);

        const indicator = loaderElement.querySelector('canvas[data-role=load-indicator]') as HTMLCanvasElement | undefined;
        if (indicator) {
            const ctx = indicator.getContext('2d')!;

            const alpha = (0.5 + stored.size / imageCount * 0.5).toFixed(5);
            ctx.fillStyle = `rgba(0,0,255,${alpha})`;
            ctx.fillRect(imageIndex, 10, 1, 40);

            updateDisplay();
        }

        // show preview image in canvas
        const [w, h] = metadata.voxelCount;
        const typedBuffer = new arrayClass(buffer);
        const imageData = drawToImageData([w, h], typedBuffer, metadata.dicomWindow);
        imageDataCollection.set(imageIndex, imageData);

        previewController.value = imageIndex.toString();
        previewIndex.innerText = previewController.value;
        preview.getContext('2d')!.putImageData(imageData, 0, 0);
    }

    let transferConnection: TransferConnection | null = null;

    let startTime = -1;

    // Layout
    const container = document.createElement('div');
    container.classList.add('row', 'no-gutturs');
    loaderElement.append(container);
    const previewContainer = document.createElement('div');
    previewContainer.classList.add('col-2', 'pr-1');
    container.append(previewContainer);
    const rightSide = document.createElement('div');
    rightSide.classList.add('col-10');
    container.append(rightSide);
    const row1 = document.createElement('div');
    rightSide.append(row1);
    const row2 = document.createElement('div');
    rightSide.append(row2);
    const row3 = document.createElement('div');
    rightSide.append(row3);

    const imageCount = metadata.voxelCount[2];

    // Display metadata
    row1.classList.add('d-flex', 'justify-content-between');
    const seriesUidContainer = document.createElement('div');
    row1.append(seriesUidContainer);
    seriesUidContainer.innerText = seriesUid.substring(0, 12) + (seriesUid.length > 12 ? '... ' : ' ') + (partialVolumeString || '');

    const counterContainer = document.createElement('div');
    row1.append(counterContainer);
    counterContainer.innerText = `${stored.size} / ${imageCount}`;
    const updateDisplay = () => {
        const t = new Date().getTime() - startTime;
        const mbps = loadedLength * 0.001 / t;
        counterContainer.innerText = `${stored.size} / ${imageCount}`
            + ` ${loadedLength.toLocaleString()} bytes`
            + ` ${t.toLocaleString()} ms `
            + ` ${mbps.toFixed(2)} Mbps`;
    };

    row3.classList.add('d-flex', 'justify-content-between');
    divAt(row3).innerText = 'Higher priority images: ' + higherPriorityImages.join(',');

    // Loading indicator
    const indicator = document.createElement('canvas');
    indicator.setAttribute('data-role', 'load-indicator');
    indicator.setAttribute('width', imageCount.toString());
    indicator.setAttribute('height', '50');
    indicator.style.setProperty('image-rendering', 'pixelated');
    indicator.style.setProperty('margin-top', '0.2rem');
    indicator.style.setProperty('width', '100%');
    indicator.style.setProperty('height', '50px');
    indicator.style.setProperty('border', '1px solid #999999');
    row2.append(indicator);

    const ctx = indicator.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,255,255,1.0)';
    higherPriorityImages.forEach(zIndex => ctx.fillRect(zIndex, 0, 1, 8));

    // Preview control range
    const previewController = document.createElement('input');
    previewController.setAttribute('type', 'range');
    previewController.setAttribute('min', '0');
    previewController.setAttribute('max', (imageCount - 1).toString());
    previewController.setAttribute('step', '1');
    previewController.style.setProperty('width', '100%');
    previewController.addEventListener('input', () => {
        const imageData = imageDataCollection.get(Number(previewController.value));
        previewIndex.innerText = previewController.value;
        if (imageData) {
            preview.getContext('2d')!.putImageData(imageData, 0, 0);
        } else {
            preview.getContext('2d')!.clearRect(0, 0, imageCount, 50);
        }
    });
    row2.append(previewController);

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

    const previewIndex = document.createElement('div');
    previewIndex.classList.add('text-center');
    previewContainer.append(previewIndex);

    // Buttons
    const buttonContainer = divAt(row3);
    // Start
    const startButton = document.createElement('button');
    startButton.setAttribute('data-role', 'start-button');
    startButton.classList.add('btn', 'btn-sm', 'btn-secondary', 'mr-2');
    startButton.innerText = 'Start';
    startButton.addEventListener('click', () => {
        if (transferConnection) return;

        startTime = new Date().getTime();
        const partialVolumeDescriptor = toPartialVolumeDescriptor(partialVolumeString);
        transferConnection = beginTransfer({ seriesUid, partialVolumeDescriptor }, handler);
        seriesUidContainer.innerText = seriesUidContainer.innerText + `#${transferConnection.id}`;

        logger.info(`#${transferConnection.id} beginTransfer`);
        transferConnection.setPriority(higherPriorityImages, 10);
        logger.info(`#${transferConnection.id} setPriority`);
    });
    buttonContainer.append(startButton);

    // ChangePriority
    // const changePriorityButton = document.createElement('button');
    // changePriorityButton.classList.add('btn', 'btn-sm', 'btn-secondary', 'mr-2');
    // changePriorityButton.innerText = 'Change Priority ' + higherPriorityImages.toString();
    // changePriorityButton.addEventListener('click', () => {
    //     logger.info(`#${transferConnection.id()} setPriority`);
    //     transferConnection.setPriority(higherPriorityImages, 10);
    // });
    // buttonContainer.append(changePriorityButton);

    // Pause
    const pauseButton = document.createElement('button');
    pauseButton.classList.add('btn', 'btn-sm', 'btn-secondary', 'mr-2');
    pauseButton.innerText = 'Pause';
    pauseButton.addEventListener('click', () => {
        if (!transferConnection) return;
        logger.info(`#${transferConnection.id} pauseTransfer`);
        transferConnection.pause();
    });
    buttonContainer.append(pauseButton);

    // Resume
    const resumeButton = document.createElement('button');
    resumeButton.classList.add('btn', 'btn-sm', 'btn-secondary', 'mr-2');
    resumeButton.innerText = 'Resume';
    resumeButton.addEventListener('click', () => {
        if (!transferConnection) return;
        logger.info(`#${transferConnection.id} resumeTransfer`);
        transferConnection.resume();
    });
    buttonContainer.append(resumeButton);

    // Abort
    const abortButton = document.createElement('button');
    abortButton.classList.add('btn', 'btn-sm', 'btn-secondary', 'mr-2');
    abortButton.innerText = 'Abort';
    abortButton.addEventListener('click', () => {
        if (!transferConnection) return;
        logger.info(`#${transferConnection.id} stopTransfer`);
        transferConnection.abort();
        transferConnection = null;
    });
    buttonContainer.append(abortButton);

    // Dispose
    const disposeButton = document.createElement('button');
    disposeButton.setAttribute('data-role', 'dispose-button');
    disposeButton.classList.add('btn', 'btn-sm', 'btn-secondary', 'mr-2');
    disposeButton.innerText = 'Dispose';
    disposeButton.addEventListener('click', () => {
        if (transferConnection) {
            logger.info(`#${transferConnection.id} stopTransfer`);
            transferConnection.abort();
            transferConnection = null;
        }
        loaderElement.remove();
    });
    buttonContainer.append(disposeButton);

    const wrapper = document.querySelector('[data-role=loader-container]') as HTMLElement | undefined;
    if (wrapper) wrapper.append(loaderElement);
}
