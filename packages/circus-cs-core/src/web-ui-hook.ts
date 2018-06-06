export async function inQueue(jobId: string): Promise<void> {
  console.log("Notice inQueue");
}

export async function proccessing(jobId: string): Promise<void> {
  console.log("Notice proccessing");
}

export async function timeout(jobId: string): Promise<void> {
  console.log("Notice timeout");
}

export async function failed(
  jobId: string,
  result: string,
  tmpPluginInputDir: string,
  tmpPluginOutputDir: string
): Promise<void> {
  console.log("Notice failed");
}

export async function invalidated(
  jobId: string,
  result: string,
  tmpPluginInputDir: string,
  tmpPluginOutputDir: string,
  e: any
): Promise<void> {
  console.log("Notice invalidated");
}

export async function finished(
  jobId: string,
  result: string,
  tmpPluginInputDir: string,
  tmpPluginOutputDir: string
): Promise<void> {
  console.log("Notice finished");
}

export async function cancelled(jobId: string): Promise<void> {
  console.log("Notice cancelled");
}
