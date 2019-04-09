import connectDb from '../db/connectDb';
import createValidator from '../createValidator';
import createModels from '../db/createModels';
import inquirer from 'inquirer';
import semver from 'semver';

export function help() {
  console.log('Interactively register a new CAD plug-in.\n');
}

export async function exec() {
  const res = await inquirer.prompt([
    {
      type: 'input',
      name: 'pluginId',
      message: 'Plugin ID (Docker image hash):',
      validate: s => /^[a-z0-9]{64}$/.test(s) || 'Must be 64-char hex string.'
    },
    {
      type: 'input',
      name: 'pluginName',
      message: 'Plugin Name:',
      validate: s => /^[a-zA-Z0-9\-_]+$/.test(s) || 'Invalid name.'
    },
    {
      type: 'input',
      name: 'version',
      message: 'Plugin Version:',
      validate: s =>
        semver.valid(s) ? true : 'Version must be semver-compatible.'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description:'
    }
  ]);

  console.log('\n', res, '\n');

  const confirm = await inquirer.prompt([
    { type: 'confirm', name: 'ok', message: 'Is this OK?' }
  ]);
  if (!confirm.ok) return;

  const doc = {
    ...res,
    type: 'CAD',
    icon: {
      glyph: 'calc',
      color: '#ffffff',
      backgroundColor: '#008800'
    },
    displayStrategy: []
  };

  const db = await connectDb();
  try {
    await db
      .collection('pluginDefinitions')
      .ensureIndex({ pluginId: 1 }, { unique: true });
    const validator = await createValidator();
    const models = await createModels(db, validator);
    await models.plugin.insert(doc);
    console.log(`Registered ${doc.pluginName} v${doc.version}`);
  } finally {
    await db.close();
  }
}
