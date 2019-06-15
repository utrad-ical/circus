export default class Pudding {
  constructor(private times: number = 2, deps: any) {}
  public eat() {
    return `pudding eaten ${this.times} times`;
  }
}
