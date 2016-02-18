/**
 * Promisified XHR
 * @deprecated Use 3rd-party library such as 'request'
 */
export class XhrPromise {
	public static send(url: string, options: any = {}): Promise<any>
	{
		let {
			method = 'GET',
			headers: any = {}
		} = options;
		return new Promise<any>((resolve, reject) => {
			let xhr = new XMLHttpRequest();
			xhr.onload = () => {
				resolve(xhr.response);
			}
			xhr.ontimeout = reject;
			xhr.onerror = reject;
			xhr.open(method, url);
			xhr.send();
		});
	}
}
