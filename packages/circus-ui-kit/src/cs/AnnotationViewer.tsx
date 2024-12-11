import {
  Annotation,
  Composition,
  MprViewState,
  RawData,
  Tool,
  toolFactory,
  Vector3D,
  VoxelCloud,
  WebGlRawVolumeMprImageSource
} from '@utrad-ical/circus-rs/src/browser';
import React, { useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { ImageViewer, StateChangerFunc } from '../ui/ImageViewer';
import { CsResultsContext } from './CsResultsContext';
import { ColorDefinition, normalizeColor } from './displays/utils/color';
import { useVolumeLoaders } from './useVolumeLoader';

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
    job: { series }
  } = useContext(CsResultsContext);
  const [composition, setComposition] = useState<Composition | null>(null);

  const toolsRef = useRef<{ [name in ToolName]: Tool }>();
  toolsRef.current ??= {
    pager: toolFactory('pager'),
    pan: toolFactory('pan'),
    zoom: toolFactory('zoom')
  };
  const tools = toolsRef.current;

  const [volumeLoader] = useVolumeLoaders([series[volumeId]]);

  useEffect(() => {
    const src = new WebGlRawVolumeMprImageSource({ volumeLoader });
    const composition = new Composition(src);
    setComposition(composition);
  }, [volumeLoader]);

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
        tool={tools[toolName] ?? tools.pager}
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
