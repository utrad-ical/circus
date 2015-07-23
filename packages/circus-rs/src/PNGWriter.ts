export default class PNGWriter {

	protected config: any = null;

	constructor(config: any) {
		this.config = config;
		this.initialize();
	}

	protected initialize() {
		// abstract
	}

	public write(res: any, data: Buffer, width: number, height: number): void
	{
		// abstract
	}
}
