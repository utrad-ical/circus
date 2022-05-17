import { RsHttpClient } from "browser";
import { dummyVolume } from "ws-temporary-config";
import { createTransferClientFactory, TransferClientFactory } from "../../browser/ws/createTransferClientFactory";
import DebugLogger from "./DebugLogger";
import WebSocketClient from "../../browser/ws/WebSocketClient";

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
}

async function handleClickCreateButton(apiClient: RsHttpClient, logger: DebugLogger, factory: TransferClientFactory) {

    const { seriesUid } = dummyVolume;
    const metadata = await apiClient.request(`series/${seriesUid}/metadata`, {});

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

        const canvas = loaderElement.querySelector('canvas[data-role=load-indicator]') as HTMLCanvasElement | undefined;
        if(canvas) {
            const ctx = canvas.getContext('2d')!;
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
            ctx.fillRect(imageNo, 0, 1, 50);
        }
    }

    const transferClient = await factory.make({ seriesUid }, handler);

    const onClickStartButton = () => {
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

    // Loaded Image Cells
    const imageCount = metadata.voxelCount[2];
    const indicator = document.createElement('canvas');
    indicator.setAttribute('data-role', 'load-indicator');
    indicator.setAttribute('width', imageCount.toString());
    indicator.setAttribute('height', '50');
    indicator.style.setProperty('margin-top', '0.2rem');
    indicator.style.setProperty('width', '100%');
    indicator.style.setProperty('height', '50px');
    indicator.style.setProperty('border', '1px solid #999999');
    loaderElement.append(indicator);

    const wrapper = document.querySelector('[data-role=loader-container]') as HTMLElement | undefined;
    if (wrapper) wrapper.append(loaderElement);
}


