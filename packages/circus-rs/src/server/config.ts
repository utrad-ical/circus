import merge from 'merge';
import 'json5/lib/require';
import minimist from 'minimist';
import path from 'path';

const config = require('../../config/default');

const argv = minimist(process.argv.slice(2));

let configData = {};

if (argv.config) {
  configData = require(argv.config);
} else {
  try {
    const local = path.resolve(__dirname, '../../config/local');
    configData = require(local);
  } catch (err) {
    console.log(err);
    console.log('No valid configuration file specified. Using defaults...');
  }
}
merge.recursive(config, configData);

export default config;
