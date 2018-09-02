#!/usr/bin/env node

require('@babel/register');
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const packageFile = path.join(__dirname, './package.json');
const version = JSON.parse(fs.readFileSync(packageFile, 'utf8')).version;
const glob = require('glob-promise');

async function main() {
  const commandFiles = await glob(path.join(__dirname, 'src/scripts/*.js'));
  const commands = commandFiles.map(p => path.basename(p, '.js'));
  const command = process.argv[2];
  console.log(`CIRCUS-API CLI version ${version}\n`);
  if (commands.indexOf(command) >= 0) {
    const module = require(path.join(__dirname, 'src/scripts', `${command}.js`))
      .default;
    module(process.argv.slice(3));
  } else if (command === 'help') {
    const target = process.argv[3];
    if (commands.indexOf(target) >= 0) {
      const module = require(path.join(
        __dirname,
        'src/scripts',
        `${target}.js`
      )).help;
      module();
    } else {
      console.log('No commands for ' + target);
    }
  } else {
    console.log('Usage: circus [command]\n');
    console.log('Available commands:');
    commands.forEach(com => {
      console.log('  ' + com);
    });
    console.log('  help [command]');
  }
}

main();
