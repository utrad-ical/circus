import CommandAction from './CommandAction.js';

const createCommand: CommandAction = ({ getFetch }) => {
  return async () => {
    const fetch = getFetch();
    const res = await fetch('preferences');
    const prefs = await res.json();
    console.log(prefs);
  };
};

export default createCommand;
