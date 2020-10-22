// https://stackoverflow.com/a/63666289/1209240
const isTouchDevice = () => {
  return window.matchMedia('(hover: none), (pointer: coarse)').matches;
};

export default isTouchDevice;
