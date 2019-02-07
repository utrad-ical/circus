#!/usr/bin/env node

require('@babel/register');
require('dotenv').config();
const dashdash = require('dashdash');

const fs = require('fs');
const path = require('path');

const packageFile = path.join(__dirname, './package.json');
const version = JSON.parse(fs.readFileSync(packageFile, 'utf8')).version;
const glob = require('glob-promise');

const [, , commandName, ...argv] = process.argv;

async function importModule(moduleName) {
  const modulePath = path.join(__dirname, 'src/scripts', `${moduleName}.js`);
  return require(modulePath);
}

async function main() {
  const commandFiles = await glob(path.join(__dirname, 'src/scripts/*.js'));
  const commands = commandFiles.map(p => path.basename(p, '.js'));

  const printUsage = () => {
    console.log('Usage: circus [command]\n');
    console.log('Available commands:');
    commands.forEach(command => console.log('  ' + command));
    console.log('  help [command]');
  };

  console.log(`CIRCUS-API CLI version ${version}\n`);
  if (commands.indexOf(commandName) >= 0) {
    const module = await importModule(commandName);
    try {
      const options = module.options ? module.options() : [];
      const parser = dashdash.createParser({ options });
      const opts = parser.parse(process.argv.slice(1));
      await module.exec.call(null, opts);
    } catch (err) {
      console.error(err.message);
      console.error(err.errors);
    }
  } else if (commandName === 'help') {
    const targetCommand = argv[0];
    if (commands.indexOf(targetCommand) >= 0) {
      const module = await importModule(targetCommand);
      module.help(argv);
    } else {
      if (targetCommand) {
        console.error('No help for ' + targetCommand);
      } else {
        printUsage();
      }
    }
  } else {
    if (commandName) {
      console.error('No command named ' + commandName);
      process.exit(1);
    } else {
      printUsage();
    }
  }
}

main();
