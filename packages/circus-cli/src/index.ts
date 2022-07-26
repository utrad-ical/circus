import createAuthorizedFetch from './createAuthorizedFetch.js';
import 'dotenv/config';
import { Command } from 'commander';
import CreateCommand from './commands/CreateCommand.js';
import pc from 'picocolors';

const checkEnv = () => {
  const CIRCUS_API_TOKEN = process.env.CIRCUS_API_TOKEN;
  const CIRCUS_API_ENDPOIT = process.env.CIRCUS_API_ENDPOINT;
  if (!CIRCUS_API_TOKEN || !CIRCUS_API_ENDPOIT) {
    console.error(
      pc.red(
        'Missing environment variables to connect to CIRCUS API Server.\n'
      ) +
        'You need to create an .env file.\n' +
        'See README.md.'
    );
    return false;
  }
  if (!CIRCUS_API_ENDPOIT.endsWith('/')) {
    console.error(pc.red('CIRCUS_API_ENDPOINT must end with a slash.'));
    return false;
  }
  return true;
};

const main = async () => {
  if (!checkEnv()) return;
  const apiToken = process.env.CIRCUS_API_TOKEN!;
  const apiEndpoint = process.env.CIRCUS_API_ENDPOINT!;
  const fetch = createAuthorizedFetch(apiToken, apiEndpoint);
  const program = new Command();

  program.name('circus-api').description('CLI for CIRCUS API Server');

  const commands = ['preferences', 'dl-cases'];

  for (const command of commands) {
    const createCommand: CreateCommand = (
      await import(`./commands/${command}.js`)
    ).default;
    const cmd = createCommand(fetch);
    cmd.configureCommand(program).action(cmd.run);
  }

  program.parse();
};

main().catch(err => {
  console.error('Error!');
  console.error(err);
});
