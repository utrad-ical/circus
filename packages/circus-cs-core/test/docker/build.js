const chalk = require('chalk');
const fs = require('fs-extra');
const cp = require('child_process');
const path = require('path');

// Builds mock docker images into the local machine.

const build = async target => {
  console.log('\n' + chalk.yellow(`Building circus-mock-${target}`));

  const tmpDir = path.resolve(__dirname, 'tmp');
  await fs.ensureDir(tmpDir);

  const dockerFile = unindent(`
    FROM node:12-alpine
    LABEL description="CIRCUS Plug-in mock ${target}" version="1.0.0"
    ADD main.js /main.js
    ADD results /results
    ADD plugin.json /plugin.json
    CMD ["node", "main.js", "${target}"]
  `);
  await fs.writeFile(path.join(tmpDir, 'Dockerfile'), dockerFile);
  const pluginDefinitionFile = JSON.stringify({
    pluginName: `circus-mock-${target}`,
    version: '1.0.0'
  });
  await fs.writeFile(path.join(tmpDir, 'plugin.json'), pluginDefinitionFile);
  await fs.copy('../results', path.join(tmpDir, 'results'), {
    recursive: true
  });
  await fs.copy('main.js', path.join(tmpDir, 'main.js'));

  const image = `circus-mock-${target}`;
  await passthru('docker', ['image', 'rm', image]);
  try {
    const code = await passthru('docker', ['build', './tmp', '-t', image]);
    if (code === 0) {
      console.log(chalk.green(`Build succeeded for ${image}`));
    } else {
      console.error(chalk.red(`Build failed for ${image}`));
    }
  } finally {
    await fs.remove(tmpDir);
  }
};

const unindent = str =>
  str
    .split('\n')
    .map(s => s.replace(/^\s+/, ''))
    .join('\n');

/**
 * Spawns a command and pipes all output to stdout/stderr.
 */
const passthru = (cmd, args) => {
  return new Promise((resolve, reject) => {
    const p = cp.spawn(cmd, args);
    p.stdout.pipe(process.stdout);
    p.stderr.pipe(process.stderr);
    p.on('close', code => resolve(code));
  });
};

const main = async () => {
  const targets = ['succeed', 'error', 'timeout'];
  for (target of targets) {
    try {
      await build(target);
    } catch (err) {
      console.error(err.message);
    }
  }
  console.log('\nRun "docker images" to check if all mock images are created.');
};

main();
