import createSpinner from '../utils/createSpinner.js';
import CommandAction from './CommandAction.js';

const action: CommandAction = ({ getFetch }) => {
  return async () => {
    const fetch = getFetch();
    const res = await (async () => {
      const spinner = createSpinner('Fetching preferences...');
      try {
        return await fetch('preferences');
      } finally {
        spinner.stop();
      }
    })();
    const prefs = await res.json();
    console.log(prefs);
  };
};

export default action;
