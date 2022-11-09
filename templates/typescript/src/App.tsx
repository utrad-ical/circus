import React, { useMemo } from "react";
import styled from "styled-components";
import { DicomVolumeLoader } from "@utrad-ical/circus-rs/lib/browser";
import axios from "axios";
import sampleJob from "./sampleJob.json";
import SampleViewer from "./components/SampleViewer";

import {
  Job,
  Plugin,
  CsResultsContext,
  SeriesDefinition,
  FeedbackEntry,
} from "@utrad-ical/circus-ui-kit";

const App = () => {
  const resultsContext = useMemo<any | undefined>(() => {
    if (!sampleJob) return undefined;

    const loadAttachment = (path: string, signal?: AbortSignal) => {
      const url = `http://localhost:3000/${path}`;
      return fetch(url);
    };
    loadAttachment.list = async () => {
      const url = `http://localhost:3000/`;
      const res = await axios.get(url);
      return res.data;
    };
    return {
      job: sampleJob,
      plugin: {} as Plugin,
      consensual: true,
      editable: true,
      loadAttachment,
      eventLogger: (action: string, data?: any) => {},
      rsHttpClient: {},

      getVolumeLoader: (series: SeriesDefinition) => {
        return {} as DicomVolumeLoader;
      },
      loadDisplay: (name: string) => {
        return {} as Promise<any>;
      },
    };
  }, []);
  const personalOpinionsForKey = (key: string): FeedbackEntry<never>[] => {
    const test: FeedbackEntry<never>[] = [];
    return test;
  };
  const value: never = 0 as never;
  return (
    <>
      <h1>Check the original CIRCUS CAD viewer</h1>
      <StyledDiv>
        <CsResultsContext.Provider value={resultsContext}>
          <SampleViewer
            initialFeedbackValue={undefined}
            onFeedbackChange={(status) => {}}
            personalOpinions={personalOpinionsForKey("test")}
            options={{}}
          />
        </CsResultsContext.Provider>
      </StyledDiv>
    </>
  );
};

export default App;

const StyledDiv = styled.div`
  font-family: "Helvetica Neue", "Helvetica", "ヒラギノ角ゴ ProN W3",
    "Hiragino Kaku Gothic ProN", "メイリオ", Meiryo, sans-serif;
  font-size: 16px;
  line-height: 1.42857143;
  background-color: white;
  color: black;
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 0;
  table {
    border-collapse: collapse;
    width: 500px;
  }
  th {
    text-align: left;
    padding: 6px;
  }
  th,
  td {
    border-top: 1px solid silver;
  }

  .table-hover > tbody > tr:hover {
    background-color: #eeeeee;
  }
  .table-striped > tbody > tr:nth-of-type(odd) {
    background-color: #eeeeee;
  }
`;
