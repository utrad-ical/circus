'use strict';

import { Sprite } from './sprite';
import { ViewState } from './view-state';

export abstract class Annotation {
  public abstract draw( canvasDomElement:HTMLCanvasElement, viewState:ViewState ):Sprite
}
