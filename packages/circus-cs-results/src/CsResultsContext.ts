import React, { useContext } from 'react';
import {
  RsHttpClient,
  DicomVolumeLoader
} from '@utrad-ical/circus-rs/src/browser';
import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import { Display } from './Display';

export interface FeedbackEntry<T> {
  userEmail: string;
  createdAt: string; // ISO date string
  isConsensual: boolean;
  data: T;
}

export interface SeriesDefinition {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor;
}

export interface FeedbackTarget {
  feedbackKey: string;
  caption: string;
  type: string;
  options: any;
}

export interface Job {
  jobId: string;
  pluginId: string;
  series: SeriesDefinition[];
  feedbacks: FeedbackEntry<any>[];
  createdAt: string;
  results: any;
}

export interface Plugin {
  pluginId: string;
  displayStrategy: FeedbackTarget[];
}

export type PluginAttachmentLoader = (
  path: string,
  signal?: AbortSignal
) => Promise<Response>;

export type EventLogger = (message: string) => void;

export interface CsResultsContextType {
  /**
   * Holds the basic information regarding this job.
   */
  job: Job;
  /**
   * Holds the basic information regarding the plug-in.
   */
  plugin: Plugin;
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
  /**
   * Returns access to cached volume loader.
   */
  getVolumeLoader: (series: SeriesDefinition) => DicomVolumeLoader;
  /**
   * Dynamically loads a display.
   */
  loadDisplay: <O extends object, F>(name: string) => Promise<Display<O, F>>;
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
