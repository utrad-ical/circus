// import performSearch from '../../performSearch';

export const handleGet = ({ models }) => {
  return async (ctx, next) => {
    // Should use
    // await performSearch(models.plugins, {}, ctx, {});

    // The following is a mock results
    ctx.body = {
      items: [
        {
          pluginId: 'aaabbbcccdddeee',
          pluginName: 'Lung-CAD',
          pluginVersion: '2.0.1',
          icon: {
            glyph: 'lung',
            color: '#ffffff',
            backgroundColor: '#ff5500'
          }
        },
        {
          pluginId: 'fffggghhhiiikkk',
          pluginName: 'MRA-CAD',
          pluginVersion: '3.0.1',
          icon: {
            glyph: 'brain',
            color: '#ffffff',
            backgroundColor: '#0088ff'
          }
        }
      ],
      totalItems: 2,
      page: 1
    };
  };
};
