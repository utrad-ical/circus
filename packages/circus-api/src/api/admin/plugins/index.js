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
            glyph: 'b-lung',
            color: '#ffffff',
            backgroundColor: '#ffff00'
          }
        },
        {
          pluginId: 'fffggghhhiiikkk',
          pluginName: 'MRA-CAD',
          pluginVersion: '3.0.1',
          icon: {
            glyph: 'b-brain',
            color: '#ffffff',
            backgroundColor: '#ffff00'
          }
        }
      ],
      totalItems: 1,
      page: 1
    };
  };
};
