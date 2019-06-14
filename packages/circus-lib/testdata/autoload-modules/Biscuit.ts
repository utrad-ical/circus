export default class Biscuit {
  constructor(_deps: {}, private times: number = 2) {}
  public eat() {
    return `biscuit eaten ${this.times} times`;
  }
}
