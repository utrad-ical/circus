import { api } from 'utils/api';

export function loadPluginInfo(pluginId) {
  return async (dispatch, getState) => {
    const state = getState();
    if (state.plugin[pluginId]) return;
    dispatch({
      type: 'LOADING_PLUGIN_INFO',
      pluginId
    });
    const pluginData = await api(`plugins/${pluginId}`);
    dispatch({
      type: 'LOAD_PLUGIN_INFO',
      pluginId,
      data: pluginData
    });
  };
}
