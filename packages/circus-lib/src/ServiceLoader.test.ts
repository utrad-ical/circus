import ServiceLoader from './ServiceLoader';

test('simple create', async () => {
  class Fighter {}
  interface Services {
    fighter: Fighter;
  }

  const loader = new ServiceLoader<Services>({});
  loader.register('fighter', Fighter);
  const result = await loader.get('fighter');
  expect(result instanceof Fighter).toBe(true);
});

test('create with dependency', async () => {
  class Fighter {
    constructor(deps: { weapon?: Weapon }) {
      expect(deps.weapon instanceof Weapon).toBe(true);
    }
    static dependencies: Array<keyof Services> = ['weapon'];
  }

  const fn = jest.fn();
  class Weapon {
    constructor() {
      fn();
    }
  }

  interface Services {
    fighter: Fighter;
    weapon: Weapon;
  }

  const loader = new ServiceLoader<Services>({});
  loader.register('fighter', Fighter);
  loader.register('weapon', Weapon);
  const result = await loader.get('fighter');
  expect(result instanceof Fighter).toBe(true);
  expect(fn).toBeCalledTimes(1);
});

test('create with options', async () => {
  class Fighter {
    public number: any;
    constructor(deps: {}, options: any) {
      this.number = options;
    }
  }
  interface Services {
    fighter: Fighter;
  }

  const config = { fighter: { options: 50 } };
  const loader = new ServiceLoader<Services>(config);
  loader.register('fighter', Fighter);
  const result = await loader.get('fighter');
  expect(result.number).toBe(50);
});

test('creawte with factory', async () => {
  interface Services {
    fighter: 'abc';
  }
  const loader = new ServiceLoader<Services>();
  loader.registerFactory('fighter', async () => 'abc');
  const result = await loader.get('fighter');
  expect(result).toBe('abc');
});

test.skip('create with directory', async () => {});
