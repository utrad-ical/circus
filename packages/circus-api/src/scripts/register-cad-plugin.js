import connectDb from '../db/connectDb';
import createValidator from '../createValidator';
import createModels from '../db/createModels';
import inquirer from 'inquirer';
import semver from 'semver';
import DockerRunner from '@utrad-ical/circus-cs-core/src/util/DockerRunner';

export function help(optionText) {
  console.log(
    'Registers a new CAD plug-in.\n' +
      'The plug-in must be already loaded as a Docker image,\n' +
      'and the image must contain a plugin manifest file.\n\n' +
      'Usage: node circus.js register-cad-plugin DOCKER_IMAGE_ID'
  );
  console.log(optionText);
}

export const options = () => {
  return [];
};

const main = async (options, models) => {
  const { _args: imageIds } = options;
  if (!imageIds.length) {
    throw new Error('Specify a plugin ID (Docker image hash).');
  }
  if (imageIds.length > 1) {
    throw new Error('You cannot install more than one plug-in at a time.');
  }
  const pluginId = imageIds[0];

  if (!/^[a-z0-9]{64}$/.test(pluginId)) {
    throw new Error('The plug-in ID must be 64-char hex string.');
  }

  if (await models.plugin.findById(pluginId)) {
    throw new Error('This plug-in is already installed.');
  }

  const runner = new DockerRunner();
  const manifestText = await runner.loadFromTextFile(pluginId, '/plugin.json');

  const manifest = JSON.parse(manifestText);

  if (!/^[a-zA-Z0-9\-_]+$/.test(manifest.pluginName)) {
    throw new Error('The plug-in name in the manifest file is invalid.');
  }

  if (!semver.valid(manifest.version)) {
    throw new Error(
      'The version string in the manifest file must be semvar-compatible.'
    );
  }

  const data = {
    pluginId,
    pluginName: manifest.pluginName,
    version: manifest.version,
    description: manifest.description || ''
  };

  console.log('\n', data, '\n');

  const confirm = await inquirer.prompt([
    { type: 'confirm', name: 'ok', message: 'Is this OK?' }
  ]);
  if (!confirm.ok) return;

  const doc = {
    ...data,
    type: 'CAD',
    icon: {
      glyph: 'calc',
      color: '#ffffff',
      backgroundColor: '#008800'
    },
    displayStrategy: []
  };
  await models.plugin.insert(doc);
  console.log(`Registered ${doc.pluginName} v${doc.version}`);
};

export async function exec(options) {
  // Check if there is already a plug-in
  const db = await connectDb();
  try {
    await db
      .collection('pluginDefinitions')
      .ensureIndex({ pluginId: 1 }, { unique: true });
    const validator = await createValidator();
    const models = await createModels(db, validator);
    await main(options, models);
  } finally {
    await db.close();
  }
}
