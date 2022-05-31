import { PartialVolumeDescriptor } from "@utrad-ical/circus-lib";

export type VolumeSetting = {
    server: string;
    seriesUid: string;
    partialVolumeDescriptor: PartialVolumeDescriptor | undefined;
};

let config: VolumeSetting[] = [];

const restore = () => {
    config = JSON.parse(localStorage.getItem('rs-ws-config') || '[]');
    // const cfg = JSON.parse(localStorage.getItem('rs-demo-save') || 'null');
    // if (config.length === 0 && cfg) {
    //     const { server, seriesUid, partialVolumeDescriptor } = cfg;
    //     add(server, seriesUid, partialVolumeDescriptor)
    // }
    console.log(config);
}

const save = () => {
    localStorage.setItem('rs-ws-config', JSON.stringify(config));
}

const add = (
    server: string,
    seriesUid: string,
    partialVolumeDescriptor: string
) => {
    config.push({
        server,
        seriesUid,
        partialVolumeDescriptor: toPartialVolumeDescriptor(partialVolumeDescriptor)
    });
    save();
}

const remove = (idx: number) => {
    config.splice(idx, 1);
    save();
}

const get = (idx: number) => config[idx];

const count = () => config.length;

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

restore();

export default { add, remove, get, count };
