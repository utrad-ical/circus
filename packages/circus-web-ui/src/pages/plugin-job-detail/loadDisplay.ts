import {
  Display,
  Choice,
  LesionCandidates
} from '@utrad-ical/circus-cs-results';

const map: { [name: string]: Display<any, any> } = {
  Choice,
  LesionCandidates
};

const loadDisplay = async (name: string): Promise<Display<any, any>> => {
  if (name in map) {
    return map[name];
  } else {
    return (await import(/* webpackIgnore: true */ name)).default;
  }
};

export default loadDisplay;
