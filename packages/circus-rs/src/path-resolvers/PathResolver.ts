import Promise = require('bluebird');

export default class PathResolver {
	protected config: any = null;

	constructor(config: any) {
		this.config = config;
		this.initialize();
	}

	protected initialize(): void {
		// abstract
	}

	public resolvePath(seriesUID: string): Promise<string> {
		return null;
	}
}