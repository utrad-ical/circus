// This is a mock of CIRCUS CS plug-in job manager.

let queue = [];
let serverStatus = 'stopped';

export async function registerJob(jobId, request, priority = 0) {
  if (queue.some(item => item.jobId === jobId)) {
    throw new Error('Duplicated job ID.');
  }
  queue.push({ jobId, priority, request });
  return;
}

export async function cancelJob(jobId) {
  queue = queue.filter(item => item.jobId !== jobId);
  return;
}

export async function listQueue() {
  return queue;
}

export async function start() {
  serverStatus = 'running';
}

export async function stop() {
  serverStatus = 'stopped';
}

export async function status() {
  return serverStatus;
}
