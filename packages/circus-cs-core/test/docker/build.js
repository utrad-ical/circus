const chalk = require('chalk');
const fs = require('fs-extra');
const cp = require('child_process');

// Builds mock docker images into the local machine.

const build = async target => {
  console.log('\n' + chalk.yellow(`Building circus-mock-${target}`));
  const dockerFile = unindent(`
    FROM node:12-alpine
    LABEL description="CIRCUS Plug-in mock ${target}" version="1.0.0"
    RUN mkdir -p /circus/in /circus/out
    ADD main.js /main.js
    CMD [ "node", "main.js", "${target}" ]
  `);
  const image = `circus-mock-${target}`;
  await passthru('docker', ['image', 'rm', image]);
  await fs.writeFile('Dockerfile', dockerFile);
  const code = await passthru('docker', ['build', '.', '-t', image]);
  if (code === 0) {
    console.log(chalk.green(`Build succeeded for ${image}`));
  } else {
    console.error(chalk.red(`Build failed for ${name}`));
  }
  await fs.remove('Dockerfile');
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
