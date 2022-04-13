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

        if (imageNo === 0) console.time(transferClient.id());
        if (imageNo === 29) console.timeEnd(transferClient.id());

        if (loadCounter.has(imageNo)) {
            loadCounter.set(imageNo, loadCounter.get(imageNo)! + 1);
        } else {
            loadCounter.set(imageNo, 1);
        }
        const cell = loaderElement.querySelector(`[data-role=image-${imageNo}]`) as HTMLInputElement | undefined;
        if (cell) {
            switch (loadCounter.get(imageNo)!) {
                case 1:
                    cell.classList.add('bg-success');
                    break;
                case 2:
                    cell.classList.add('bg-warning');
                    break;
                default:
                    cell.classList.add('bg-danger');
                    break;
            }
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
    const table = document.createElement('table');
    table.classList.add('table', 'table-sm', 'table-bordered', 'text-center', 'mt-2');
    loaderElement.append(table);
    const tbody = document.createElement('tbody');
    table.append(tbody);
    let tr: HTMLTableRowElement | undefined = undefined;
    const nextRow = () => (tr = document.createElement('tr')) && tbody.append(tr);
    const imageCount = metadata.voxelCount[2];
    for (let i = 0; i < imageCount; i++) {
        if (0 === (i % 10)) nextRow();
        const td = document.createElement('td');
        td.classList.add('p-0');
        td.setAttribute('data-role', `image-${i}`);
        td.innerText = i.toString();
        tr!.append(td);
    }

    const wrapper = document.querySelector('[data-role=image-no-table]') as HTMLElement | undefined;
    if (wrapper) wrapper.append(loaderElement);
}


