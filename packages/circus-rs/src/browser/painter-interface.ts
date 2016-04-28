'use strict'

import { Sprite } from './sprite'

export interface Painter {
	draw: ( c: HTMLCanvasElement, vs: any ) => Sprite;
}
