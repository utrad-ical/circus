'use strict';

export abstract class ImageSource {
  public abstract draw( canvasDomElement, viewState ):Promise<any>;
}
