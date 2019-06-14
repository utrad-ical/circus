import ServiceLoader from './ServiceLoader';
import path from 'path';

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
  type Hasher = (str: string) => string;
  interface Services {
    hasher: Hasher;
  }
  const myHash = async (deps: any) => {
    expect(deps).toEqual({});
    return (str: string) => 'abcd0123';
  };
  const loader = new ServiceLoader<Services>();
  loader.register('hasher', myHash);
  const result = await loader.get('hasher');
  expect(result('a')).toBe('abcd0123');
});

test('create with dependency', async () => {
  class Fighter {
    constructor(deps: { weapon?: Weapon }) {
      expect(deps.weapon instanceof Weapon).toBe(true);
    }
    static dependencies = ['weapon'];
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
  expect(result).toBeInstanceOf(Fighter);
  expect(fn).toBeCalledTimes(1);
  expect.assertions(3);
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

describe('autoloading with registerDirectory', () => {
  const dir = path.join(__dirname, '../testdata/autoload-modules');
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

  test('throws when no type is specified', async () => {
    const options = { food: { options: 5 } }; // type is missing
    const loader = new ServiceLoader<Services>(options);
    loader.registerDirectory('food', dir, 'Biscuit');
    await expect(loader.get('food')).rejects.toThrow(/type/);
  });
});

test('dependencies must not be created more than once', async () => {
  const fn = jest.fn();

  class Gunlancer {
    constructor({ gunlance }: Partial<Services>) {
      fn();
      expect(gunlance).toBeInstanceOf(Gunlance);
    }
    static dependencies = ['gunlance'];
  }

  class Gunner {
    constructor({ gun }: Partial<Services>) {
      fn();
      expect(gun).toBeInstanceOf(Gun);
    }
    static dependencies = ['gun'];
  }

  class Gunlance {
    constructor({ gun }: Partial<Services>) {
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
