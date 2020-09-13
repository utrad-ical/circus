export default interface LoadingIndicator {
  (ctx: CanvasRenderingContext2D, time: number): void;
}
