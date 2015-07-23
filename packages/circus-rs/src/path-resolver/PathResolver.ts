export default class PathResolver {
	protected config: any = null;

	constructor(config: any) {
		this.config = config;
		this.initialize();
	}

	protected initialize() {
		// abstract
	}

	public resolvePath(seriesUID: string, callback: (dir: string) => void): void {
		// abstract
	}
}