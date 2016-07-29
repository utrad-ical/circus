/**
 * Base PathResolver class. A PathResolver receives a series instance UID
 * and returns the path of the physical directory
 * which contains the correspoinding DICOM files.
 */
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
