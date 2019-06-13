/**
 * @deprecated Use ServiceLoader instead.
 */
export default class DependentModuleLoader<
  P extends object = any,
  K extends keyof P = keyof P
> {
  private loader: { [R in keyof P]?: any };
  private dependingModules: { [R in keyof P]?: K[] };
  private loadedModules: Partial<P>;

  constructor() {
    this.loader = {};
    this.loadedModules = {};
    this.dependingModules = {};
  }

  public registerLoader<X extends K, Y extends K>(
    name: X,
    fn: (loadedModules: NonNullable<Pick<P, Y>>) => Promise<P[X]>,
    depends: Y[] = []
  ): void {
    this.loader[name] = fn;
    this.dependingModules[name] = depends;
  }

  public ready<X extends K>(name: X): boolean {
    return (
      name in this.loader &&
      !this.dependingModules[name]!.some(i => !this.ready(i))
    );
  }

  public async load<X extends K>(name: X): Promise<P[X]> {
    if (!(name in this.loader))
      throw new TypeError('Loader for ' + name + ' is not registered');

    if (name in this.loadedModules) return <P[X]>this.loadedModules[name];

    const counter = this.countReference(name);
    await (Object.keys(counter) as K[])
      .sort((a, b) =>
        counter[a] === counter[b] ? 0 : counter[a] < counter[b] ? 1 : -1
      )
      .reduce(
        (p: Promise<P[K] | void>, m) => p.then(() => this.load(m)),
        Promise.resolve()
      );

    this.loadedModules[name] = await this.loader[name](this.loadedModules);

    return <P[X]>this.loadedModules[name];
  }

  public countReference(name: K): { [K in keyof P]?: number } {
    const counter: { [K in keyof P]?: number } = {};
    this.collectDependenciesWithCountReference(name, counter);
    return counter;
  }

  private collectDependenciesWithCountReference(
    name: K,
    counter: { [K in keyof P]?: number } = {}
  ): K[] {
    if (!(name in this.loader)) return [];

    let depending: K[] = [];
    this.dependingModules[name]!.forEach(dep => {
      const appends: K[] = [
        ...this.collectDependenciesWithCountReference(dep, counter),
        dep
      ].filter(i => !depending.some(j => j === i));
      appends.forEach(a => {
        counter[a] = counter[a] !== undefined ? counter[a]! + 1 : 1;
        depending.push(a);
      });
    });

    return depending;
  }
}
