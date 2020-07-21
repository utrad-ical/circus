import { ApiCaller } from 'utils/api';

const loadPluginInfo = (api: ApiCaller, pluginId: string) => {
  return async (dispatch: any, getState: any) => {
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
};
