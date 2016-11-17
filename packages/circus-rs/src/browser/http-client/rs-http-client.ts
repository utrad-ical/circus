import axios, { AxiosRequestConfig } from 'axios';

/**
 * Simple HTTP wrapper that connects to the CIRCUS RS server and returns the response
 * in the appropriate format.
 */
export class RsHttpClient {
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

	public request(command: string, params: any, responseType: string = 'json'): Promise<any> {
		const url = `${this.host}/${command}`;

		const config: AxiosRequestConfig = {
			method: 'get',
			url,
			params,
			responseType
		};

		if (typeof this.token === 'string') {
			config.headers = { Authorization: `Bearer ${this.token}` };
		}
		return axios(config).then(res => res.data) as any as Promise<any>;
	}
}
