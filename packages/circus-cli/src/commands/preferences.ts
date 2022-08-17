import { fetchWithSpinner } from '../utils/createAuthorizedFetch.js';
import CommandAction from './CommandAction.js';

const action: CommandAction = ({ getFetch }) => {
  return async () => {
    const fetch = getFetch();
    const res = await fetchWithSpinner(
      fetch,
      'Fetching preferences',
      'preferences'
    );
    const prefs = await res.json();
    console.log(prefs);
  };
};

export default action;
