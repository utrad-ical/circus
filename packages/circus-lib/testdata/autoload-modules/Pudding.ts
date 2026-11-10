export default class Pudding {
  private times: number;
  constructor(times: number = 2, deps: any) {
    this.times = times;
  }
  public eat() {
    return `pudding eaten ${this.times} times`;
  }
}
