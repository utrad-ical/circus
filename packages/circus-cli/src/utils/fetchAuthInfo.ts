import type { z } from 'zod';

export const fetchAuthInfo = async <T>(
  endpoint: string,
  resource: 'status' | 'login-info',
  schema: z.ZodType<T>,
  token?: string
): Promise<T> => {
  const url = new URL(resource, endpoint);
  const unexpectedResponse = (status: number) =>
    `Unexpected response (HTTP ${status}) from ${url}.`;
  let response: Response;
  let body: unknown;
  try {
    response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    if (response.status === 200) {
      body = await response.json().catch((error: unknown) => {
        if (!(error instanceof SyntaxError)) throw error;
      });
    } else {
      await response.body?.cancel();
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error(`Request to ${url} timed out.`);
    }
    throw new Error(`Could not reach ${url}.`);
  }
  if (response.status !== 200) {
    if (resource === 'status') {
      throw new Error(unexpectedResponse(response.status));
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(`The API rejected this token (HTTP ${response.status}).`);
    }
    throw new Error(`Request to ${url} returned HTTP ${response.status}.`);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      resource === 'status'
        ? `${unexpectedResponse(200)} This is not a valid API endpoint.`
        : `Unexpected response from ${url}.`
    );
  }
  return parsed.data;
};
