import { RsHttpClient } from "browser";
import { createTransferConnectionFactory, TransferConnection, TransferConnectionFactory } from "../../browser/ws/createTransferConnectionFactory";
import DebugLogger from "./DebugLogger";
import WebSocketClient from "../../browser/ws/WebSocketClient";
import drawToImageData from "../../browser/image-source/drawToImageData";
import { pixelFormatInfo } from '@utrad-ical/circus-lib/src/PixelFormat';
import setting from './setting';
import { PartialVolumeDescriptor } from "@utrad-ical/circus-lib";

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
    partialVolumeDescriptor?: PartialVolumeDescriptor
) {

    const metadata = await apiClient.request(`series/${seriesUid}/metadata`, {});
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
    const loadCounter = new Map<number, number>();
    let loadedLength = 0;

    const divAt = (parent?: HTMLElement) => {
        const el = document.createElement('div');
        if (parent) parent.append(el);
        return el;
    };

    const handler = (imageNo: number, buffer: ArrayBuffer) => {
        loadedLength += buffer.byteLength;
        if (loadCounter.has(imageNo)) {
            loadCounter.set(imageNo, loadCounter.get(imageNo)! + 1);
        } else {
            loadCounter.set(imageNo, 1);
        }

        const indicator = loaderElement.querySelector('canvas[data-role=load-indicator]') as HTMLCanvasElement | undefined;
        if (indicator) {
            const ctx = indicator.getContext('2d')!;

            const alpha = (0.5 + loadCounter.size / imageCount * 0.5).toFixed(5);
            ctx.fillStyle = `rgba(0,0,255,${alpha})`;
            ctx.fillRect(imageNo - 1, 10, 1, 40);

            updateDisplay();
        }

        // show preview image in canvas
        const [w, h] = metadata.voxelCount;
        const typedBuffer = new arrayClass(buffer);
        const imageData = drawToImageData([w, h], typedBuffer, metadata.dicomWindow);
        const preview = loaderElement.querySelector('canvas[data-role=load-preview]') as HTMLCanvasElement | undefined;
        if (preview) preview.getContext('2d')!.putImageData(imageData, 0, 0);
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
    seriesUidContainer.innerText = seriesUid.substring(0, 12) + (seriesUid.length > 12 ? '...' : '');// partialVolumeDescriptor

    const counterContainer = document.createElement('div');
    row1.append(counterContainer);
    counterContainer.innerText = `${loadCounter.size} / ${imageCount}`;
    const updateDisplay = () => {
        const t = new Date().getTime() - startTime;
        const mbps = loadedLength * 0.001 / t;
        counterContainer.innerText = `${loadCounter.size} / ${imageCount}`
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
    indicator.style.setProperty('margin-top', '0.2rem');
    indicator.style.setProperty('width', '100%');
    indicator.style.setProperty('height', '50px');
    indicator.style.setProperty('border', '1px solid #999999');
    row2.append(indicator);

    const ctx = indicator.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,255,255,1.0)';
    higherPriorityImages.forEach(imageNo => ctx.fillRect(imageNo - 1, 0, 1, 8));

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

    // Stop
    const stopButton = document.createElement('button');
    stopButton.classList.add('btn', 'btn-sm', 'btn-secondary', 'mr-2');
    stopButton.innerText = 'Stop';
    stopButton.addEventListener('click', () => {
        if (!transferConnection) return;
        logger.info(`#${transferConnection.id} stopTransfer`);
        transferConnection.stop();
        transferConnection = null;
    });
    buttonContainer.append(stopButton);

    // Dispose
    const disposeButton = document.createElement('button');
    disposeButton.setAttribute('data-role', 'dispose-button');
    disposeButton.classList.add('btn', 'btn-sm', 'btn-secondary', 'mr-2');
    disposeButton.innerText = 'Dispose';
    disposeButton.addEventListener('click', () => {
        if (!transferConnection) return;
        logger.info(`#${transferConnection.id} stopTransfer`);
        transferConnection.stop();
        transferConnection = null;
        loaderElement.remove();
    });
    buttonContainer.append(disposeButton);

    const wrapper = document.querySelector('[data-role=loader-container]') as HTMLElement | undefined;
    if (wrapper) wrapper.append(loaderElement);
}

