// import performSearch from '../../performSearch';

export const handleGet = ({ models }) => {
  return async (ctx, next) => {
    // The following is a mock result
    ctx.body = {
      pluginId: 'fffggghhhiiikkk',
      pluginName: 'MRA-CAD',
      pluginVersion: '3.0.1',
      icon: {
        glyph: 'brain',
        color: '#ffffff',
        backgroundColor: '#0088ff'
      }
    };
  };
};
