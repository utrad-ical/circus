'use strict'

import { ViewState } from './view-state'
import { Sprite } from './sprite'

export interface Painter {
	draw: ( c: HTMLCanvasElement, vs: ViewState ) => Sprite;
}
