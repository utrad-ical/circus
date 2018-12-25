interface AuthorizationInfo {
  [token: string]: Date;
}

export default class AuthorizationCache {
  private config: any;
  private cache: AuthorizationInfo = {};
  private disposalTimer: NodeJS.Timer;

  constructor(config: any) {
    this.config = config || {};

    this.disposalTimer = setInterval(() => {
      const now: Date = new Date();
      for (let x in this.cache) {
        let limit: Date = this.cache[x];
        if (limit.getTime() <= now.getTime()) {
          delete this.cache[x];
        }
      }
    }, 3600 * 1000);
  }

  public dispose(): void {
    clearInterval(this.disposalTimer);
  }

  /**
   * Update token lifetime.
   * @param series DICOM series instance UID.
   * @param token The token previously issued.
   */
  public update(series: string, token: string): void {
    let currentDate: Date = new Date();
    currentDate.setTime(currentDate.getTime() + this.config.expire * 1000);
    this.cache[token + '_' + series] = currentDate;
  }

  /**
   * Removes all the previously made tokens.
   */
  public reset(): void {
    this.cache = {};
  }

  /**
   * Validate query string to check if access is granted.
   * @param req HTTP request. Must contain 'series' query parameter and Authorization http header.
   * @return True if the access to the series is granted.
   */
  public isValid(series: string, token: string): boolean {
    const key: string = token + '_' + series;
    const now: Date = new Date();
    const date: Date = this.cache[key];

    if (date == null) {
      // logger.debug('token not found');
      return false;
    }

    if (now.getTime() <= date.getTime()) {
      this.update(series, token);
      return true;
    }

    // logger.debug('Found token has been expired');
    delete this.cache[key];
    return false;
  }
}
