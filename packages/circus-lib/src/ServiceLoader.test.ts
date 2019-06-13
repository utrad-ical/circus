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
