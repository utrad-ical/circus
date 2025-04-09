// これはCSのリモートCAD呼び出しアダプタの一種。
// 責務はraw画像データなどが入っている入力ディレクトリのパスを受け取り、
// それをリモートに何らかの方法で転送してCADを実行させ、
// JobResponseの形式で処理のリアルタイムログおよび処理結果を返すこと。

// 以下の実装ではCADの起動とログをHTTPの1リクエストで行い、
// 結果の取得は別のリクエストで行っている。
// 処理結果がGCSに保管される場合を想定している。
// ただし具体的にどんなリクエストが何回走るのかは実装の詳細なので
// この関数内に隠蔽されている。

import { formatError } from '../../util/error';
import { appendDirectoryToFormData } from '../../util/form';
import type {
  JobResponse,
  JobResult,
  RemoteAdapter
} from '../../util/remote-job';
import { sseStreamReader } from '../../util/streams';

const remoteCadImpl: RemoteAdapter = async (
  cadDefinition,
  inputDir
): Promise<JobResponse> => {
  const logStream = new TransformStream(); // PassThrough
  const logWriter = logStream.writable.getWriter();

  // Perform most of the job inside this Promise
  // to ensure that this function itself never throws (rejects).
  const result = (async (): Promise<JobResult> => {
    try {
      // Send files using form-multipart
      const fd = new FormData();
      await appendDirectoryToFormData(fd, inputDir);

      const authHeader = {
        Authorization: `Bearer ${cadDefinition.authentication}`
      };

      // Add timeout to prevent hanging connections
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout

      const req = new Request(`${cadDefinition.endpoint}/run`, {
        method: 'POST',
        headers: { ...authHeader },
        body: fd
      });

      try {
        const res = await fetch(req, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
          console.error(
            `Failed to submit job, status: ${res.status} ${res.statusText}`
          );
          return {
            status: 'failed',
            errorMessage: 'Failed to submit job'
          };
        }

        const reqId = res.headers.get('X-Request-ID');
        if (!reqId) throw new Error('No X-Request-ID header in response');

        let errorMessage: null | string = null;
        // Converts byte stream to string stream
        const bodyStream = res.body!.pipeThrough(new TextDecoderStream());
        try {
          for await (const event of sseStreamReader(bodyStream)) {
            if (event.type === 'log') {
              logWriter.write((event.data as string) + '\n');
            } else if (
              event.type === 'error' ||
              event.type === 'internalServerError'
            ) {
              errorMessage = event.data as string;
            } else if (event.type === 'finished') {
              // Explicit handling of finished event
              break;
            }
          }
        } catch (streamError) {
          console.error('Error reading SSE stream:', streamError);
          errorMessage =
            'Error reading server response: ' + formatError(streamError);
        }

        if (typeof errorMessage === 'string') {
          return {
            status: 'failed',
            errorMessage
          };
        }

        // Job finished, start to fetch the result
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 30000); // 30 second timeout

        try {
          const res2 = await fetch(
            `${cadDefinition.endpoint}/result/${reqId}`,
            {
              headers: { ...authHeader },
              signal: controller2.signal
            }
          );
          clearTimeout(timeoutId2);

          if (!res2.ok) {
            console.error(await res2.text());
            return {
              status: 'failed',
              errorMessage: 'Failed to fetch result data'
            };
          }

          return {
            status: 'finished',
            resultStream: res2.body!
          };
        } catch (fetchError) {
          clearTimeout(timeoutId2);
          console.error('Error fetching results:', fetchError);
          return {
            status: 'failed',
            errorMessage:
              'Failed to fetch result data: ' + formatError(fetchError)
          };
        }
      } catch (e) {
        clearTimeout(timeoutId); // Clean up timeout if there's an error
        return {
          status: 'failed',
          errorMessage: 'Internal error: ' + formatError(e)
        };
      }
    } finally {
      logWriter.close();
    }
  })();

  return { logStream: logStream.readable, result };
};

export default remoteCadImpl;
