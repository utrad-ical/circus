export const defaultPreferences = () => {
  return {
    theme: 'mode_white',
    personalInfoView: false,
    caseSearchPresets: [],
    seriesSearchPresets: [],
    pluginJobSearchPresets: [],
    referenceLine: false,
    initailAlphaForNewLabels: 1,
    interpolationMode: 'nearestNeighbor',
    scrollBarsInfo: {},
    maintainAspectRatio: false,
    fixCenterOfGravity: false,
    dimmedOutlineFor2DLabels: 'show',
    revisionMessageTemplates: [],
    labelColors: { useDefault: true, customColors: [] }
  };
};
