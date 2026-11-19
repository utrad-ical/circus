import type { Command } from 'commander';
import inquirer from 'inquirer';
import type { Database, Models } from '../interface.ts';
import { runCommand, type CommandService } from './Command.ts';
import type { Validator } from '../interface.ts';
import type { DockerRunner } from '@utrad-ical/circus-cs-core';
import { formatPath, ValidationError } from '../createValidator.ts';
import { allRequiredExcept, only } from '../schemas/derive.ts';
import { plugin } from '@utrad-ical/circus-api-schema';

export const configure = (program: Command) =>
  program
    .command('register')
    .description(
      'Register a CAD plug-in from a Docker image containing a manifest.'
    )
    .argument('<image-id>', 'full Docker image ID')
    .action((pluginId: string) => runCommand(command, pluginId));

export const command: CommandService<
  {
    database: Database;
    validator: Validator;
    models: Models;
    dockerRunner: DockerRunner;
  },
  string
> = async (_, { database, validator, models, dockerRunner }) => {
  return async pluginId => {
    await database.db
      .collection('pluginDefinitions')
      .createIndex({ pluginId: 1 }, { unique: true });

    if (!/^[a-z0-9]{64}$/.test(pluginId)) {
      throw new Error('The plug-in ID must be 64-char hex string.');
    }

    if (await models.plugin.findById(pluginId)) {
      throw new Error('This plug-in is already installed.');
    }

    const manifestText = await dockerRunner.loadFromTextFile(
      pluginId,
      '/plugin.json'
    );

    const manifest = JSON.parse(manifestText!);

    try {
      await validator.validate(
        allRequiredExcept(
          only(plugin, [
            'type',
            'pluginName',
            'version',
            'description',
            'icon',
            'displayStrategy'
          ]),
          ['icon', 'displayStrategy']
        ),
        manifest
      );
    } catch (err) {
      if (err instanceof ValidationError) {
        const message =
          'Manifest file validation failed.\n\n' +
          err.issues.map(i => `${formatPath(i.path)}: ${i.message}`).join('\n');
        throw new Error(message);
      } else {
        throw err;
      }
    }

    if (manifest.type !== 'CAD') {
      throw new Error('The plug-in type must be "CAD".');
    }

    const doc = {
      type: 'CAD' as const,
      pluginId,
      pluginName: manifest.pluginName,
      version: manifest.version,
      description: manifest.description || '',
      icon: manifest.icon || {
        glyph: 'calc',
        color: '#ffffff',
        backgroundColor: '#008800'
      },
      displayStrategy: manifest.displayStrategy || [],
      runConfiguration: { timeout: 900, gpus: '' }
    };

    const existing = await models.plugin.findAll({
      pluginName: manifest.pluginName,
      version: manifest.version
    });
    if (existing.length) {
      throw new Error(
        'There is a plugin registered with the same name and the same version.'
      );
    }

    console.log('\n', doc, '\n');

    const confirm = await inquirer.prompt([
      { type: 'confirm', name: 'ok', message: 'Is this OK?' }
    ]);
    if (!confirm.ok) return;

    await models.plugin.insert(doc);
    console.log(`Registered ${doc.pluginName} v${doc.version}`);
  };
};

command.dependencies = ['database', 'validator', 'models', 'dockerRunner'];
