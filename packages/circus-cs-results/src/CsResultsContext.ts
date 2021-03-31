import React, { useContext } from 'react';
import { RsHttpClient } from '@utrad-ical/circus-rs/src/browser';
import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';

export interface SeriesDefinition {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor;
}

export interface Job {
  jobId: string;
  createdAt: Date;
  series: SeriesDefinition[];
}

export type PluginAttachmentLoader = (
  path: string,
  abortController?: AbortController
) => Promise<Response>;

export type EventLogger = (message: string) => void;

export interface CsResultsContextType {
  /**
   * Holds the basic information regarding this job.
   */
  job: Job;
  /**
   * True if the result screen is in consensual mode.
   */
  consensual: boolean;
  /**
   * True if the result screen accept feedback registration.
   * False if the feedback has been disabled or already registered.
   */
  editable: boolean;
  /**
   * Provides the attachment loader.
   */
  loadAttachment: PluginAttachmentLoader;
  /**
   * Can be uesd to log events happened in the plug-in result screen.
   */
  eventLogger: EventLogger;
  /**
   * HTTP Client that allows you to connect to a CIRCUS RS server.
   */
  rsHttpClient: RsHttpClient;
}

export const CsResultsContext = React.createContext<CsResultsContextType>(
  undefined as any
);

/**
 * Provides access to values shared among CS plug-in results screen.
 */
export const useCsResults = () => {
  return useContext(CsResultsContext);
};

export default CsResultsContext;
