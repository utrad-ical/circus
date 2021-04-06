import {
  Display,
  Choice,
  LesionCandidates
} from '@utrad-ical/circus-cs-results';

const builtInDisplays: { [name: string]: Display<any, any> } = {
  Choice,
  LesionCandidates
};

const loadDisplay = async <O extends object, F>(
  name: string
): Promise<Display<O, F>> => {
  if (name in builtInDisplays) {
    return builtInDisplays[name];
  } else {
    return (await import(/* webpackIgnore: true */ name)).default;
  }
};

export default loadDisplay;
