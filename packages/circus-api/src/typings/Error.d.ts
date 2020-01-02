// Extends JavaScript Error object.
// Koa uses these values.
interface Error {
  /**
   * Determines whether the error message can be exposed to the client.
   */
  expose?: boolean;

  /**
   * The HTTP status code representing this error.
   */
  status?: number;
}
