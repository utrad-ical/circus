// This is intended to be invoked inside the mock containers.
// Do not run directly!

const fs = require('fs').promises;

const inDir = '/circus/in';
const outDir = '/circus/out';

const resultData = {
  metadata: {
    displayOptions: [
      {
        volumeId: 0,
        window: { level: -600, width: 1500 },
        crop: { origin: [76, 139, 26], size: [331, 215, 215] }
      }
    ]
  },
  results: {
    lesionCandidates: [
      {
        rank: 1,
        confidence: 0.876,
        volumeId: 0,
        location: [200, 258, 58],
        volumeSize: 50.4
      }
    ]
  }
};

const main = async () => {
  const mode = process.argv[2] || 'succeed';
  console.log(`Processing a mock CAD job (mode: ${mode})...`);
  try {
    switch (mode) {
      case 'timeout':
        setTimeout(() => {
          console.log('30 seconds passed.');
        }, 30000); // This blocks the node process from exiting for 30 secs
        break;
      case 'error':
        console.log('Something went wrong.');
        process.exit(5);
        break;
      case 'succeed':
        await fs.writeFile(
          outDir + '/results.json',
          JSON.stringify(resultData),
          'utf8'
        );
        await fs.writeFile(outDir + '/log.txt', 'This is a log file.');
        await fs.writeFile(outDir + '/data.txt', 'An arbitrary result file.');
        console.log('Job successfully finished.');
        break;
      case 'check-network':
        const http = require('http');
        console.log('Making an outgoing HTTP request...');
        const req = http.request({ hostname: 'www.google.com' }, res =>
          console.log(`Status: ${res.statusCode}`)
        );
        req.on('error', e => console.log('Error', e.message));
        req.end();
        break;
    }
  } catch (err) {
    console.error(err.stack || err.message);
  }
};

main();
