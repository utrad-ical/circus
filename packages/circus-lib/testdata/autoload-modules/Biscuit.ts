export default class Biscuit {
  private times: number;
  constructor(times: number = 2, deps: {}) {
    this.times = times;
  }
  public eat() {
    return `biscuit eaten ${this.times} times`;
  }
}
