// import performSearch from '../../performSearch';

export const handleGet = ({ models, cs }) => {
  return async (ctx, next) => {
    // Should use
    // await performSearch(models.plugins, {}, ctx, {});

    // Fetch from cs-core
    const csPluginList = await cs.plugin.list();

    // combine icon info
    const items = csPluginList.map( plugin => {
      return {
        pluginId: plugin.pluginId,
        pluginName: plugin.pluginName,
        pluginVersion: plugin.version,
        icon: getIconMock(plugin.pluginId)
      };
    } );

    ctx.body = {
      items,
      totalItems: items.length,
      page: 1
    };
  };
};

function getIconMock(pluginId) {
  const r = Math.random();
  switch (true){
    case r < 0.5:
      return {
        glyph: 'lung',
        color: '#ffffff',
        backgroundColor: '#ff5500'
      };
    default:
      return {
        glyph: 'brain',
        color: '#ffffff',
        backgroundColor: '#0088ff'
      };
  }

}