import CreateCommand from './CreateCommand.js';

const createCommand: CreateCommand = fetch => ({
  configureCommand: program => {
    return program
      .command('preferences')
      .description('Displays your preferences.');
  },
  run: async () => {
    const res = await fetch('preferences');
    const prefs = await res.json();
    console.log(prefs);
  }
});

export default createCommand;
