'use strict'

import { VolumeViewState } from './volume-view-state'
import { Sprite } from './sprite'

export interface Painter {
	draw: ( c: HTMLCanvasElement, vs: VolumeViewState ) => Sprite;
}
