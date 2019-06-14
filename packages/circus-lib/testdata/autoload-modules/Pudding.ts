export default class Pudding {
  constructor(_deps: {}, private times: number = 2) {}
  public eat() {
    return `pudding eaten ${this.times} times`;
  }
}
