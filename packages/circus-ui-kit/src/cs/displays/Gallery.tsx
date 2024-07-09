import React, {
  RefObject,
  useEffect,
  useRef,
  createRef,
  useState
} from 'react';
import get from 'lodash.get';
import { useCsResults } from '../CsResultsContext';
import { Display } from '../Display';
import { useErrorMessage } from './utils/useErrorMessage';
import classnames from 'classnames';
import styled from 'styled-components';

export type GalleryLabelPosition = 'left' | 'right' | 'top' | 'bottom';

export interface GalleryOptions {
  /**
   * Image file infomation list to display.
   */
  imageInfo: {
    fileName: string;
    maxWidth?: number;
    maxHeight?: number;
    labelData?: {
      customLabel?: string;
      dataPath?: string;
    }[];
    labelPosition?: GalleryLabelPosition;
  }[];
  /**
   * Number of images per column. Sum of imageCountsPerColumn must be the length of imageInfo.
   */
  imageCountsPerColumn?: number[];
}

const extToMIME = new Map([
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
  ['svg', 'image/svg+xml'],
  ['apng', 'image/apng'],
  ['avif', 'image/avif']
]);

const getImageSubtype = (fileName: string) => {
  const ext = fileName.split('.').pop();
  if (!ext) return undefined;
  return extToMIME.get(ext);
};

const loadImage = async (
  file: string,
  element: RefObject<HTMLImageElement>,
  mimeType: string | undefined,
  loadAttachment: any
) => {
  const res = await loadAttachment(file);
  if (res.status === 200) {
    const img = await res.arrayBuffer();
    const view = new Uint8Array(img);
    const blob = new Blob([view], { type: mimeType });
    const url = URL.createObjectURL(blob);
    element.current!.src = url;
  }
};

const getTargetLabels = (
  labelInfo: { customLabel?: string; dataPath?: string }[] | undefined,
  results: any
) => {
  const targetLabels: string[] = [];
  labelInfo &&
    labelInfo.forEach(({ customLabel, dataPath }) => {
      const label = dataPath ? get(results, dataPath) : undefined;
      (customLabel || label) &&
        targetLabels.push(
          customLabel && label
            ? `${customLabel} ${label}`
            : customLabel || label
        );
    });
  return targetLabels;
};

export const Gallery: Display<GalleryOptions, void> = props => {
  const {
    options: { imageInfo = [], imageCountsPerColumn = [] }
  } = props;
  const { job, loadAttachment } = useCsResults();
  const { results } = job;
  const [labels, setLabels] = useState<{ [key: number]: string[] }>({});
  const [error, setError] = useErrorMessage();
  const imgRefs = useRef<RefObject<HTMLImageElement>[]>(
    Object.values(imageInfo).map(() => createRef())
  );

  useEffect(() => {
    if (!job || !imgRefs.current) return;

    imageInfo.forEach(async ({ fileName, labelData }, idx) => {
      const mimeType = getImageSubtype(fileName);
      if (mimeType === undefined) {
        setError(`Unsupported image type: ${fileName}`);
        return;
      }

      loadImage(fileName, imgRefs.current[idx], mimeType, loadAttachment);

      const targetLabels = getTargetLabels(labelData, results);
      if (targetLabels.length > 0) {
        setLabels(prevState => ({ ...prevState, [idx]: targetLabels }));
      }
    });
  }, [job, loadAttachment]);

  if (error) return error;

  const imagesForEachRow =
    imageCountsPerColumn.reduce((a, b) => a + b, 0) === imageInfo.length
      ? imageCountsPerColumn
      : Array(imageInfo.length).fill(1);

  return (
    <>
      {imagesForEachRow.map((count, i) => {
        const startId = imagesForEachRow.slice(0, i).reduce((a, b) => a + b, 0);
        const targetImageInfo = imageInfo.slice(startId, startId + count);

        return (
          <StyledImageDiv key={`colum ${i}`} columns={count}>
            {Object.values(targetImageInfo).map((info, i) => (
              <div
                key={i + startId}
                className={classnames('item', info.labelPosition ?? 'bottom')}
              >
                <img
                  className="image"
                  ref={imgRefs.current[i + startId]}
                  alt={`Image ${info.fileName}`}
                  style={{
                    maxWidth: info.maxWidth ?? 'initial',
                    maxHeight: info.maxHeight ?? 'initial'
                  }}
                />
                <div className="labels">
                  {labels[i + startId]?.map((label, labelInd) => (
                    <div key={labelInd}>{label}</div>
                  ))}
                </div>
              </div>
            ))}
          </StyledImageDiv>
        );
      })}
    </>
  );
};

const StyledImageDiv = styled.div`
  display: grid;
  grid-template-columns: repeat(${(props: any) => props.columns}, auto);
  grid-gap: 10px;
  padding-bottom: 10px;

  .item {
    display: flex;
  }
  .image {
    align-self: flex-start;
  }
  .right {
    flex-direction: row;
  }
  .left {
    flex-direction: row-reverse;
    justify-content: flex-end;
  }
  .top {
    flex-direction: column-reverse;
  }
  .bottom {
    flex-direction: column;
  }
  .labels {
    padding: 0.5rem;
  }
`;
