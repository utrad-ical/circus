import RawData from './RawData';

export default class DicomVolume extends RawData {
	// Estimated window, calculated from the actual voxel data
	public wl: number = 1500;
	public ww: number = 2000;

	// Default window, described in DICOM file
	public dcm_wl: number;
	public dcm_ww: number;

	// Holds misc DICOM header data
	protected header: any = {};

	public appendHeader(header: any): void {
		for (var key in header) {
			this.header[key] = header[key];
		}
	}

	public setEstimatedWindow(level: number, width: number): void {
		this.wl = level;
		this.ww = width;
	}
}