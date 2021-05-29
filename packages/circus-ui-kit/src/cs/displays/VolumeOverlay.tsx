import { gunzipSync } from 'fflate';
import get from 'lodash.get';
import React, { useEffect, useState } from 'react';
import { AnnotationDef, AnnotationViewer } from '../AnnotationViewer';
import { useCsResults } from '../CsResultsContext';
import { Display } from '../Display';
import { ColorDefinition } from './utils/color';
import { useErrorMessage } from './utils/useErrorMessage';

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
   * Defaults to `${name}.raw.gz`.
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

  const [error, setError] = useErrorMessage();
  const [annotationDefs, setAnnotationDefs] = useState<AnnotationDef[]>([]);

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
      const buffers = await Promise.all(
        volumes.map(async v => {
          const name = v.rawFile ?? `${v.name}.raw.gz`;
          const res = await loadAttachment(name);
          if (res.status !== 200) {
            throw new Error(
              `Failed to load volume file ` +
                `(name: ${v.name}, status: ${res.status}, file: ${name})`
            );
          }

          return /\.gz$/.test(name)
            ? (gunzipSync(new Uint8Array(await res.arrayBuffer()))
                .buffer as ArrayBuffer)
            : await res.arrayBuffer();
        })
      );
      const annotationDefs = volumes.map(
        (v, i): AnnotationDef => ({
          type: 'voxels',
          color: colorMap[v.name] ?? defaultColor,
          origin: v.origin,
          size: v.size,
          volume: buffers[i]
        })
      );
      setAnnotationDefs(annotationDefs);
    };
    load().catch(err => setError(err.message));
  }, []);

  if (error) return error;

  return (
    <AnnotationViewer
      volumeId={volumeId}
      annotations={annotationDefs}
      width={512}
      height={512}
    />
  );
};
