// This module includes type declarations for pointer lock API,
// which is experimental

interface HTMLCanvasElement {
  requestPointerLock(): void;
}

interface Document {
  exitPointerLock(): void;
}
