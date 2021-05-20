import {
  Composition,
  HybridMprImageSource,
  RawData,
  toolFactory,
  VoxelCloud
} from '@utrad-ical/circus-rs/src/browser';
import get from 'lodash.get';
import React, { useEffect, useMemo, useState } from 'react';
import { ImageViewer } from '../../ui/ImageViewer';
import { useCsResults } from '../CsResultsContext';
import { Display } from '../Display';
import { ColorDefinition, normalizeColor } from './utils/color';
import styled from 'styled-components';

export interface VolumeOverlayOptions {
  volumeId?: number;
  /**
   * Where the volume list is stored in results.json.
   */
  dataPath?: string;
  /**
   * Maps the lesion name to display color.
   */
  colorMap?: { [key: string]: ColorDefinition };
  /**
   * Uses this color when the volume name is not listed in `colorMap`.
   */
  defaultColor?: ColorDefinition;
  /**
   * Only shows these volumes in the results data.
   */
  only?: string[];
}

export interface VolumeOverlayEntry {
  volumeId?: number;
  name: string;
  origin: [number, number, number];
  size: [number, number, number];
  /**
   * Defaults to `${name}.raw`.
   */
  rawFile?: string;
}

/**
 * Renders an ImageViewer with overlaied 3D lesions.
 */
export const VolumeOverlay: Display<VolumeOverlayOptions, void> = props => {
  const {
    options: {
      volumeId = 0,
      dataPath = 'results.volumes',
      colorMap = {},
      defaultColor = '#ffff0088',
      only
    }
  } = props;
  const { job, loadAttachment, getVolumeLoader, rsHttpClient } = useCsResults();
  const { results } = job;

  const [composition, setComposition] = useState<Composition | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const load = async () => {
      const allVolumes = get(results, dataPath) as VolumeOverlayEntry[];
      if (!Array.isArray(allVolumes))
        throw new Error(`There is no volume data at "${dataPath}".`);
      const volumes = allVolumes.filter(
        v =>
          (Array.isArray(only) ? only.includes(v.name) : true) &&
          volumeId === (v.volumeId ?? 0)
      );
      if (!volumes.length) throw new Error('There is no volume to show.');
      const series = job.series[volumeId];
      const volumeLoader = getVolumeLoader(series);
      const src = new HybridMprImageSource({
        volumeLoader,
        rsHttpClient,
        seriesUid: series.seriesUid
      });
      const composition = new Composition(src);
      setComposition(composition);
      const rawVolumes = await Promise.all(
        volumes.map(async v => {
          const name = v.rawFile ?? `${v.name}.raw`;
          const res = await loadAttachment(name);
          if (res.status !== 200) {
            throw new Error(
              `Failed to load volume file (name: ${v.name}, status: ${res.status}, file: ${name})`
            );
          }
          return res.arrayBuffer();
        })
      );
      volumes.forEach((v, i) => {
        const cloud = new VoxelCloud();
        cloud.origin = v.origin;
        const rawData = new RawData(v.size, 'binary');
        rawData.assign(rawVolumes[i]);
        cloud.volume = rawData;
        const nColor = normalizeColor(colorMap[v.name] ?? defaultColor);
        cloud.color = nColor.color;
        cloud.alpha = nColor.alpha;
        composition.addAnnotation(cloud);
      });
      composition.annotationUpdated();
      console.log(composition.annotations);
    };
    load().catch(err => setError(err));
  }, []);

  const tool = useMemo(() => toolFactory('pager'), []);

  if (error instanceof Error) {
    return <pre className="alert alert-danger">{error.message}</pre>;
  }

  if (!composition) return null;

  return (
    <StyledDiv>
      <ImageViewer
        className="volume-overlay-viewer"
        composition={composition}
        tool={tool}
      />
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  margin-top: 10px;
  .volume-overlay-viewer {
    width: 512px;
    height: 512px;
  }
`;
