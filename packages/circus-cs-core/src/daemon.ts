import processNextJob from "./functions/process-next-job";
import config from "./config";

const { tick, waitOnFail } = config.daemon;

let exec: boolean = true;

process.on("SIGINT", function() {
  console.log("signal SIGINT");
  console.log(new Date().toISOString() + " Dequeue daemon will be stopped on next dequeue.");
  exec = false;
});

export async function main(): Promise<void> {
  console.log(new Date().toISOString() + " Dequeue daemon started.");
  
  while (exec) {
    console.log(new Date().toISOString() + " " + "Next");

    try {
      const result = await processNextJob();
      console.log(new Date().toISOString() + " " + (result ? "OK" : "FAILED"));

      if (!result && waitOnFail && exec) {
        console.log(new Date().toISOString() + " Sleep result: false");
        await (() => new Promise((a, b) => setTimeout(a, waitOnFail)))();
      }
    } catch (e) {
      console.error(new Date().toISOString() + " ERROR " + e.message);
    }

    await (() => new Promise((a, b) => setTimeout(a, tick)))();
  }

  console.log(new Date().toISOString() + " Dequeue daemon stopped.");

  process.exit(0);
}

main();

/*
// start
var http = require('http');
var app = http.createServer(function(req, res) {
  res.writeHead(200);
  res.end('hey');
})
var listener = app.listen(0, function() {
  console.log('Listening on port ' + listener.address().port);
  // Here we send the ready signal to PM2
  process.send('ready');
});


// stop
*/
