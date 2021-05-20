import {
  Annotation,
  Composition,
  HybridMprImageSource,
  MprViewState,
  RawData,
  Tool,
  toolFactory,
  Vector3D,
  VoxelCloud
} from '@utrad-ical/circus-rs/src/browser';
import React, { useContext, useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { ImageViewer, StateChangerFunc } from '../ui/ImageViewer';
import { CsResultsContext } from './CsResultsContext';
import { ColorDefinition, normalizeColor } from './displays/utils/color';

type ToolName = 'pager' | 'zoom' | 'pan';

interface EllipseAnnotation {
  type: 'ellipse';
  color: ColorDefinition;
}

interface VoxelsAnnotation {
  type: 'voxels';
  origin: Vector3D;
  size: Vector3D;
  volume: ArrayBuffer;
  color: ColorDefinition;
}

export type AnnotationDef = EllipseAnnotation | VoxelsAnnotation;

const buildAnnotation = (def: AnnotationDef): Annotation => {
  switch (def.type) {
    case 'voxels': {
      const cloud = new VoxelCloud();
      cloud.origin = def.origin;
      const rawData = new RawData(def.size, 'binary');
      rawData.assign(def.volume);
      cloud.volume = rawData;
      const nColor = normalizeColor(def.color);
      cloud.color = nColor.color;
      cloud.alpha = nColor.alpha;
      return cloud;
    }
  }
  throw new TypeError('Invalid type');
};

/**
 * AnnotationViewer wraps Viewer and provides more convenient
 * way to display volumes along with annotations.
 * This is less flexible than normal Viewer but easier to use.
 */
export const AnnotationViewer: React.FC<{
  volumeId?: number;
  initialStateSetter?: StateChangerFunc<MprViewState>;
  toolName?: ToolName;
  width?: number;
  height?: number;
  annotations?: AnnotationDef[];
}> = props => {
  const {
    volumeId = 0,
    toolName = 'pager',
    initialStateSetter,
    annotations = [],
    width,
    height
  } = props;
  const {
    job: { series },
    getVolumeLoader,
    rsHttpClient
  } = useContext(CsResultsContext);
  const [composition, setComposition] = useState<Composition | null>(null);

  const tools = useRef<{ [name in ToolName]: Tool }>({
    pager: toolFactory('pager'),
    pan: toolFactory('pan'),
    zoom: toolFactory('zoom')
  });

  const seriesDefinition = series[volumeId];

  useEffect(() => {
    const volumeLoader = getVolumeLoader(seriesDefinition);
    const src = new HybridMprImageSource({
      volumeLoader,
      rsHttpClient,
      seriesUid: seriesDefinition.seriesUid
    });
    const composition = new Composition(src);
    setComposition(composition);
  }, [seriesDefinition]);

  useEffect(() => {
    if (!composition) return;
    composition.removeAllAnnotations();
    annotations.forEach(annotationDef => {
      composition.addAnnotation(buildAnnotation(annotationDef));
    });
    composition.annotationUpdated();
  }, [composition, annotations]);

  if (!composition) return null;

  return (
    <StyledDiv className="annotation-viewer" width={width} height={height}>
      <ImageViewer
        tool={tools.current[toolName] ?? tools.current.pager}
        composition={composition}
        initialStateSetter={initialStateSetter}
      />
      ;
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  .image-viewer {
    width: ${(props: any) => `${props.width ?? 512}px`};
    height: ${(props: any) => `${props.height ?? 512}px`};
  }
`;
