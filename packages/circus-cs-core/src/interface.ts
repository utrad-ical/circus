export type PluginJobRequest = {
	pluginId: string;
	series: JobSeries[];
	environment?: string; // deprecated
};

export type JobSeries = {
	seriesUid: string;
	startImgNum?: number;
	endImgNum?: number;
	imageDelta?: number;
	requiredPrivateTags?: string[]
};

export type JobState = "in_queue"
					|"processing"
					|"finished"
					|"failed"
					|"invalidated"
					|"cancelled";
