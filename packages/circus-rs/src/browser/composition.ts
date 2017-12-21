import { EventEmitter } from 'events';
import { Annotation } from '../browser/annotation/annotation';
import { ImageSource } from '../browser/image-source/image-source';
import { Viewer } from '../browser/viewer/viewer';

/**
 * A composition is a combination of one imageSource and
 * an arbitrary number of annotations.
 */
export class Composition extends EventEmitter {
  /**
   * The image source that is associated with this composition.
   * Do not modify this directly: Use the accessor methods instead.
   */
  public readonly imageSource: ImageSource;

  /**
   * List of viewers that are associated with this composition.
   * Do not modify this directly: Use the accessor methods instead.
   */
  public viewers: Viewer[] = [];

  /**
   * List of annotations that are associated with this composition.
   * Do not modify this directly: Use the accessor methods instead.
   */
  public annotations: Annotation[] = [];

  private imageReady: boolean = false;

  constructor(imageSource: ImageSource) {
    super();
    this.imageSource = imageSource;
    imageSource.ready().then(() => (this.imageReady = true));
  }

  /**
   * Adds a viewer to the internal list.
   * This method will be called automatically by a viewer.
   * End-users should not call this manually.
   */
  public registerViewer(viewer: Viewer): void {
    if (this.viewers.some(v => v === viewer)) return;
    this.emit('viewerChange');
    this.viewers.push(viewer);
  }

  /**
   * Removes a viewer from the internal list.
   * This method will be called automatically by a viewer.
   * End-users should not call this manually.
   */
  public unregisterViewer(viewer: Viewer): void {
    if (this.viewers.every(v => v !== viewer)) return;
    this.viewers = this.viewers.filter(v => v !== viewer);
    this.emit('viewerChange');
  }

  /**
   * Adds an annotation to this composition.
   */
  public addAnnotation(annotation: Annotation): void {
    if (this.annotations.some(a => a === annotation)) return;
    this.annotations.push(annotation);
    this.emit('annotationChange');
  }

  /**
   * Removes an annotation from this composition.
   */
  public removeAnnotation(annotation: Annotation): void {
    if (this.annotations.every(a => a !== annotation)) return;
    this.annotations = this.annotations.filter(a => a !== annotation);
    this.emit('annotationChange');
  }

  /**
   * Remove all annotations.
   */
  public removeAllAnnotations(): void {
    this.annotations = [];
    this.emit('annotationChange');
  }

  /**
   * Re-renders annotations in all of the associated viewers.
   * @param viewer Specify the viewer to update.
   */
  public annotationUpdated(viewer?: Viewer | Viewer[]): void {
    if (!this.imageReady) return;
    const viewers =
      viewer instanceof Array
        ? viewer
        : viewer instanceof Viewer ? [viewer] : this.viewers;
    viewers.forEach(v => v.renderAnnotations());
  }
}
