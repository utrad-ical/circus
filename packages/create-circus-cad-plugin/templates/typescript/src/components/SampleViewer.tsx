import React, { useState, useEffect, useRef, RefObject } from "react";
import styled from "styled-components";
import { useCsResults, Display } from "@utrad-ical/circus-ui-kit";

interface Feedback {
  comment: string;
}

const StyledDiv = styled.div`
  display: grid;
  grid-template-columns: 500px 500px;
  p {
    font-weight: bold;
    border-left: 3px solid black;
    padding-left: 10px;
  }
  .images {
    display: inline-flex;
    flex-direction: column;
  }
  .image {
    border: 1px solid black;
    margin-right: 15px;
    margin-bottom: 3px;
  }
  .value {
    text-align: right;
  }
  .legend {
    display: inline-block;
    width: 15px;
    height: 15px;
    border-radius: 4px;
    margin-right: 3px;
  }
`;

const SampleViewer: Display<any, Feedback> = (props) => {
  const { initialFeedbackValue, onFeedbackChange, personalOpinions } = props;
  const resultImgRef = useRef<HTMLImageElement>(null);
  const { job, loadAttachment } = useCsResults();
  const [results, setResults] = useState(job.results.results);
  const [resultFileList, setResultFileList] = useState<string[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<Feedback>(() => {
    if (initialFeedbackValue) {
      return initialFeedbackValue;
    }
    return {
      comment: "",
    };
  });

  useEffect(() => {
    if (!job) return;
    (async () => {
      const fileList = await loadAttachment.list();
      setResultFileList(fileList);
    })();
    const load = async (file: string, element: RefObject<HTMLImageElement>) => {
      const res = await loadAttachment(file);
      if (res.status === 200) {
        const img = await res.arrayBuffer();
        const view = new Uint8Array(img);
        const blob = new Blob([view], { type: "image/png" });
        const url = URL.createObjectURL(blob);
        element.current!.src = url;
      }
    };
    load(`sample.png`, resultImgRef);
  }, [job, loadAttachment]);

  useEffect(() => {
    if (currentFeedback["comment"] !== "") {
      onFeedbackChange({ valid: true, value: currentFeedback });
    } else {
      onFeedbackChange({ valid: false });
    }
  }, [currentFeedback]);

  const row = (caption: React.ReactNode, value: any) => (
    <tr>
      <th>
        <span className="legend" />
        {caption}
      </th>
      <td className="value">{value}</td>
    </tr>
  );

  const handleChangeComment = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setCurrentFeedback({ comment: e.target.value });

  return (
    <StyledDiv>
      <div className="images">
        <img className="image" ref={resultImgRef} alt="resultImage" />
      </div>
      <div className="info">
        <p>Summary</p>
        <table className="summary table table-hover">
          <tbody>
            {row("item01", results.item01)}
            {row("item02", results.item02)}
            {row("item03", results.item03)}
            {row("item04", results.item04)}
            {row("test", results.test)}
            {row(
              "location",
              `[${results.location[0]}, ${results.location[1]}, ${results.location[2]}]`
            )}
          </tbody>
        </table>
        <p>output files</p>
        {resultFileList.map((filename, ind) => (
          <div>{`file${ind}: ${filename}`}</div>
        ))}
      </div>
      <div>
        <p>feedback</p>
        <div>Do you have any comments?</div>
        <textarea
          value={currentFeedback["comment"]}
          onChange={handleChangeComment}
          cols={50}
          rows={3}
        />
      </div>
    </StyledDiv>
  );
};

export default SampleViewer;
