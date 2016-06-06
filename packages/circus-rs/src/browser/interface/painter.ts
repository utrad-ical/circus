'use strict'

import { Sprite }	from '../../browser/viewer/sprite';

export interface Painter {
	draw: ( c: HTMLCanvasElement, vs: any ) => Sprite;
}
