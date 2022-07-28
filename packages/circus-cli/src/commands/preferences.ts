import CreateCommand from './CreateCommand.js';

const createCommand: CreateCommand = ({ getFetch }) => ({
  configureCommand: program => {
    return program
      .command('preferences')
      .description('Displays your preferences.');
  },
  run: async () => {
    const fetch = getFetch();
    const res = await fetch('preferences');
    const prefs = await res.json();
    console.log(prefs);
  }
});

export default createCommand;
