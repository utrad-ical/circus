import DependentModuleLoader from './DependentModuleLoader';

describe('ModuleLoader', () => {
  it('must accept loader registration', async () => {
    interface SampleModuleList {
      module1: 'module-type-1';
      module2: 'module-type-2';
    }
    const ml = new DependentModuleLoader<SampleModuleList>();
    ml.registerLoader('module1', async () => 'module-type-1');
    ml.registerLoader('module2', async () => 'module-type-2', ['module1']);
    const m = await ml.load('module2');
    expect(m).toBe('module-type-2');
  });

  it('must load module and depended modules in proper sequence', async () => {
    const ml = new DependentModuleLoader();
    const mock = jest.fn();
    const loader = (name: string) => async (deps: any) => {
      mock(name, Object.keys(deps));
      return name;
    };

    // E < - - A
    // E < D < A
    // E < D < C < B
    ml.registerLoader('A', loader('A'));
    ml.registerLoader('E', loader('E'), ['A', 'D']);
    ml.registerLoader('B', loader('B'));
    ml.registerLoader('D', loader('D'), ['C', 'A']);
    ml.registerLoader('C', loader('C'), ['B']);

    const expected = {
      A: ['D', 'E'].length,
      B: ['C', 'D', 'E'].length,
      C: ['D', 'E'].length,
      D: ['E'].length
    };

    expect(ml.countReference('E')).toEqual(expected);

    await ml.load('E');

    const expectedCalls = [
      ['A', ['B']],
      ['B', []],
      ['C', ['A', 'B']],
      ['D', ['A', 'B', 'C']],
      ['E', ['A', 'B', 'C', 'D']]
    ];
    const resultCalls = mock.mock.calls
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(i => {
        i[1] = i[1].sort((a: any, b: any) => (a < b ? -1 : 1));
        return i;
      });
    expect(resultCalls).toEqual(expectedCalls);
  });

  it('must reject loading unregistered module', async () => {
    const ml = new DependentModuleLoader();
    await expect(ml.load('g')).rejects.toThrow();
    ml.registerLoader('a', async () => 'a', ['b']);
    ml.registerLoader('b', async () => 'b', ['a', 'c']);
    await expect(ml.load('b')).rejects.toThrow();
  });

  it.skip('must reject cross reference', async () => {
    // not implemented
    let ml = new DependentModuleLoader();
    ml.registerLoader('a', async () => 'a', ['b']);
    expect(() => ml.registerLoader('b', async () => 'b', ['a'])).toThrow();

    ml = new DependentModuleLoader();
    ml.registerLoader('a', async () => 'a', ['b']);
    ml.registerLoader('b', async () => 'b', ['c']);
    expect(() => ml.registerLoader('c', async () => 'c', ['a'])).toThrow();
  });
});
