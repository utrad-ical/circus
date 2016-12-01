import Logger from './loggers/Logger';
import AsyncLruCache from '../common/AsyncLruCache';
import DicomVolume from '../common/DicomVolume';
import ImageEncoder from './image-encoders/ImageEncoder';
import AuthorizationCache from './auth/AuthorizationCache';
import Counter from './Counter';

/**
 * This is a simple facade interface that aggregates helper classes
 */
export interface ServerHelpers {
	readonly logger: Logger;
	readonly seriesReader: AsyncLruCache<DicomVolume>;
	readonly imageEncoder: ImageEncoder;
	readonly authorizationCache: AuthorizationCache;
	readonly counter: Counter;
}
