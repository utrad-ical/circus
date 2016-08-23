export interface DicomMetadata {
	dicomWindow?: {
		level: number;
		width: number;
	};
	estimatedWindow?: {
		level: number;
		width: number;
	};
	voxelCount?: [ number, number, number ];
	voxelSize: [ number, number, number ];
	pixelFormat?: number;
}
