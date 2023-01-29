import React, { useContext } from 'react';
import {
  DicomVolumeLoader,
  EstimateWindowType
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

export type JobStatus =
  | 'in_queue'
  | 'processing'
  | 'finished'
  | 'error'
  | 'invalidated';

export interface Job {
  jobId: string;
  userEmail: string;
  status: JobStatus;
  pluginId: string;
  series: SeriesDefinition[];
  feedbacks: FeedbackEntry<any>[];
  createdAt: string;
  startedAt: string;
  finishedAt: string;
  results: any;
}

export interface Plugin {
  pluginId: string;
  displayStrategy: FeedbackTarget[];
}

export interface PluginAttachmentLoader {
  (path: string, signal?: AbortSignal): Promise<Response>;
  list: () => Promise<string[]>;
}

export type EventLogger = (action: string, data?: any) => void;

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
   * Hook to use volume loader.
   */
  useVolumeLoaders: (
    series: {
      seriesUid: string;
      partialVolumeDescriptor: PartialVolumeDescriptor;
      estimateWindowType?: EstimateWindowType;
    }[]
  ) => DicomVolumeLoader[];
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
