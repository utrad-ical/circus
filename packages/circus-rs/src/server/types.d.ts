import { Request } from 'express';
import DicomVolume from '../common/DicomVolume';

// This file adds some members to existing classes

declare module 'express' {
	export interface Request {
		volume: DicomVolume;
	}
}
