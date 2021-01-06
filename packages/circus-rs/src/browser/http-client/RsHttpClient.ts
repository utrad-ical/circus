import axios, { AxiosRequestConfig, ResponseType } from 'axios';

/**
 * Simple HTTP wrapper that connects to the CIRCUS RS server and returns the response
 * in the appropriate format.
 */
export default class RsHttpClient {
  /**
   * Host name, optionally with port in `host:port` format
   */
  private host: string;

  /**
   * OAuth-compatible access token
   */
  private token: string | undefined;

  constructor(host: string = 'http://localhost:3000', token?: string) {
    this.host = host;
    this.token = token;
  }

  public async request(
    command: string,
    params: any,
    responseType: ResponseType = 'json',
    abortSignal?: AbortSignal
  ): Promise<any> {
    const url = `${this.host}/${command}`;

    const source = axios.CancelToken.source();
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => source.cancel());
    }

    const config: AxiosRequestConfig = {
      method: 'get',
      url,
      params,
      responseType,
      cancelToken: source.token
    };

    if (typeof this.token === 'string') {
      config.headers = { Authorization: `Bearer ${this.token}` };
    }
    const res = await axios(config);
    return res.data;
  }
}
