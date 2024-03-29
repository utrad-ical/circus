import path from 'path';
import ServiceLoader, { FunctionService, ClassService } from './ServiceLoader';

const dir = path.join(__dirname, '../testdata/autoload-modules');

test('simple creation from class', async () => {
  class Fighter {}
  interface Services {
    fighter: Fighter; // as class
  }

  const loader = new ServiceLoader<Services>({});
  loader.register('fighter', Fighter);
  const result = await loader.get('fighter');
  expect(result).toBeInstanceOf(Fighter);
});

test('simple creation from function', async () => {
  type Gun = { shot: () => string };
  interface Services {
    gun: Gun;
  }
  const createGun: FunctionService<Gun, {}> = async (options, deps) => {
    expect(deps).toEqual({});
    return { shot: () => 'bang' };
  };
  const loader = new ServiceLoader<Services>();
  loader.register('gun', createGun);
  const result = await loader.get('gun');
  expect(result.shot()).toBe('bang');
});

test('create from module path', async () => {
  interface Services {
    food: { eat: () => string };
  }
  const loader = new ServiceLoader<Services>({ food: { options: 5 } });
  loader.registerModule('food', path.join(dir, 'Pudding'));
  const pudding = await loader.get('food');
  expect(pudding.eat()).toBe('pudding eaten 5 times');
});

describe('create with dependency', () => {
  type Fighter = { attack: () => string };
  type Weapon = { name: () => string };
  interface Services {
    fighter: Fighter;
    weapon: Weapon;
  }

  test('using classes', async () => {
    const Ninja: ClassService<Fighter> = class implements Fighter {
      constructor(options: any, deps: { weapon: Weapon }) {
        expect(deps.weapon instanceof Shuriken).toBe(true);
      }
      attack() {
        return 'use weapon';
      }
      static dependencies = ['weapon'];
    };

    const fn = jest.fn();
    class Shuriken implements Weapon {
      constructor() {
        fn();
      }
      name() {
        return 'shuriken';
      }
    }

    const loader = new ServiceLoader<Services>({});
    loader.register('fighter', Ninja);
    loader.register('weapon', Shuriken);
    const result = await loader.get('fighter');
    expect(result).toBeInstanceOf(Ninja);
    expect(fn).toBeCalledTimes(1);
    expect.assertions(3);
  });

  test('using functions', async () => {
    const createNinja: FunctionService<Fighter, { weapon: Weapon }> = async (
      options: any,
      { weapon }
    ) => {
      return { attack: () => `attacking with my ${weapon.name()}` };
    };
    createNinja.dependencies = ['weapon'];

    const createShuriken: FunctionService<Weapon> = async () => {
      return { name: () => 'shuriken' };
    };

    const loader = new ServiceLoader<Services>({});
    loader.register('fighter', createNinja);
    loader.register('weapon', createShuriken);
    const result = await loader.get('fighter');
    expect(result.attack()).toBe('attacking with my shuriken');
  });
});

test('create with options', async () => {
  class Fighter {
    public number: any;
    constructor(options: number, deps: {}) {
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

test('create with factory', async () => {
  interface Services {
    fighter: 'abc';
  }
  const loader = new ServiceLoader<Services>();
  loader.registerFactory('fighter', async () => 'abc');
  const result = await loader.get('fighter');
  expect(result).toBe('abc');
});

describe('dispose', () => {
  type Gun = { shot: () => string };
  type Lance = { attack: () => string };
  interface Services {
    gun: Gun;
    lance: Lance;
  }

  test('await and dispose', async () => {
    const fn = jest.fn();
    const loader = new ServiceLoader<Services>();
    loader.register('gun', async () => ({
      shot: () => 'bang',
      dispose: async () => fn()
    }));
    await loader.get('gun');
    await loader.dispose();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('non-await and dispose', async () => {
    const fn = jest.fn();
    const loader = new ServiceLoader<Services>();
    loader.register('gun', async () => ({
      shot: () => 'bang',
      dispose: async () => fn()
    }));
    loader.get('gun'); // Do not await
    await loader.dispose();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('no dispose', async () => {
    const loader = new ServiceLoader<Services>();
    loader.register('gun', async () => ({ shot: () => 'bang' }));
    loader.get('gun'); // Do not await
    await loader.dispose();
  });
});

describe('autoloading with registerDirectory', () => {
  interface Services {
    food: { eat: () => string };
  }

  test('load default type', async () => {
    const loader1 = new ServiceLoader<Services>();
    loader1.registerDirectory('food', dir, 'Biscuit');
    const biscuit = await loader1.get('food');
    expect(biscuit.eat()).toBe('biscuit eaten 2 times');
  });

  test('load custom type with config', async () => {
    const options = { food: { type: 'Pudding', options: 5 } };
    const loader = new ServiceLoader<Services>(options);
    loader.registerDirectory('food', dir, 'Biscuit');
    const pudding = await loader.get('food');
    expect(pudding.eat()).toBe('pudding eaten 5 times');
  });

  test('load from module using absolute path', async () => {
    const typePath = path.join(dir, 'Pudding');
    const options = { food: { type: typePath, options: 3 } };
    const loader = new ServiceLoader<Services>(options);
    loader.registerDirectory('food', dir, 'Biscuit');
    const pudding = await loader.get('food');
    expect(pudding.eat()).toBe('pudding eaten 3 times');
  });
});

test('dependencies must not be created more than once', async () => {
  const fn = jest.fn();

  class Gunlancer {
    constructor(options: any, { gunlance }: { gunlance: Gunlance }) {
      fn();
      expect(gunlance).toBeInstanceOf(Gunlance);
    }
    static dependencies = ['gunlance'];
  }

  class Gunner {
    constructor(options: any, { gun }: { gun: Gun }) {
      fn();
      expect(gun).toBeInstanceOf(Gun);
    }
    static dependencies = ['gun'];
  }

  class Gunlance {
    constructor(options: any, { gun }: { gun: Gun }) {
      fn();
      expect(gun).toBeInstanceOf(Gun);
    }
    static dependencies = ['gun'];
  }

  class Gun {
    constructor() {
      fn();
    }
  }

  interface Services {
    gunlancer: Gunlancer;
    gunner: Gunner;
    gunlance: Gunlance;
    gun: Gun;
  }

  const loader = new ServiceLoader<Services>();
  loader.register('gunlancer', Gunlancer);
  loader.register('gunner', Gunner);
  loader.register('gunlance', Gunlance);
  loader.register('gun', Gun);
  const gunlancer = await loader.get('gunlancer');
  // The same instance is requested simultaneously
  // to check if 'loading' promise is working
  const [gunner1, gunner2] = await Promise.all([
    loader.get('gunner'),
    loader.get('gunner')
  ]);
  expect(gunlancer).toBeInstanceOf(Gunlancer);
  expect(gunner1).toBeInstanceOf(Gunner);
  expect(gunner1).toBe(gunner2);
  expect(fn).toBeCalledTimes(4);
});

test('throws for unregistered service', async () => {
  const loader = new ServiceLoader<any>();
  await expect(loader.get('weapon')).rejects.toThrow(/not registered/);
});
