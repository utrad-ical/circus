export default class Biscuit {
  constructor(private times: number = 2, deps: {}) {}
  public eat() {
    return `biscuit eaten ${this.times} times`;
  }
}
