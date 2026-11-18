import type { z } from 'zod';
import type { preferences } from '@utrad-ical/circus-api-schema';
export const defaultPreferences = (): z.output<typeof preferences> => {
  return {
    theme: 'mode_white',
    personalInfoView: false,
    caseSearchPresets: [],
    seriesSearchPresets: [],
    pluginJobSearchPresets: [],
    referenceLine: false,
    initailAlphaForNewLabels: 1,
    interpolationMode: 'nearestNeighbor',
    windowPropagationScope: 'all',
    scrollBars: 'none',
    scrollBarsInfo: {},
    maintainAspectRatio: false,
    fixCenterOfGravity: false,
    dimmedOutlineFor2DLabels: 'show',
    revisionMessageTemplates: [],
    labelColors: { useDefault: true, customColors: [] }
  };
};
