import { PartialVolumeDescriptor } from "@utrad-ical/circus-lib";

/**
 * Initializer type for Multirange excluding MultiRange instance.
 */
export type MultiRangeDescriptor = string | number | (number | [number, number])[];

export type VolumeSpecifier = {
    seriesUid: string;
    partialVolumeDescriptor?: PartialVolumeDescriptor;
};

// type ReturnPromiseType<T> = T extends (...args: any[]) => Promise<infer U> ? U : never;
