// This is intended to be invoked inside the mock containers.
// Do not run directly!

const fs = require('fs').promises;

const inDir = '/circus/in';
const outDir = '/circus/out';

const main = async () => {
  const mode = process.argv[2] || 'success';
  console.log(`processing a job (mode: ${mode})...`);
  switch (mode) {
    case 'timeout':
      setTimeout(() => {
        console.log('30 seconds passed.');
      }, 30000); // This blocks the node process from exiting for 30 secs
      break;
    case 'error':
      await sleep(300);
      console.log('Something went wrong.');
      process.exit(5);
      break;
    case 'success':
      await sleep(300);
      await fs.writeFile(
        outDir + '/results.json',
        await fs.readFile('/results/succeed/results.json', 'utf8')
      );
      await fs.writeFile(outDir + '/log.txt', 'This is a log file.');
      await fs.writeFile(outDir + '/data.txt', 'An arbitrary result file.');
      console.log('Job successfully finished.');
      break;
  }
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

main();
