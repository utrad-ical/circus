import ServiceLoader from './ServiceLoader';
import path from 'path';

test('simple create', async () => {
  class Fighter {}
  interface Services {
    fighter: Fighter;
  }

  const loader = new ServiceLoader<Services>({});
  loader.register('fighter', Fighter);
  const result = await loader.get('fighter');
  expect(result).toBeInstanceOf(Fighter);
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
  expect(result).toBeInstanceOf(Fighter);
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

const dir = path.join(__dirname, '../testdata/autoload-modules');

test('create with directory', async () => {
  interface Services {
    food: { eat: () => string };
  }
  const loader1 = new ServiceLoader<Services>();
  loader1.registerDirectory('food', dir, 'Biscuit');
  const biscuit = await loader1.get('food');
  expect(biscuit.eat()).toBe('biscuit eaten 2 times');

  const options = { food: { type: 'Pudding', options: 5 } };
  const loader2 = new ServiceLoader<Services>(options);
  loader2.registerDirectory('food', dir, 'Biscuit');
  const pudding = await loader2.get('food');
  expect(pudding.eat()).toBe('pudding eaten 5 times');
});

test('dependencies must not be created more than once', async () => {
  const fn = jest.fn();

  class Gunlancer {
    constructor({ gunlance }: Partial<Services>) {
      fn();
      expect(gunlance).toBeInstanceOf(Gunlance);
    }
    static dependencies: Array<keyof Services> = ['gunlance'];
  }

  class Gunner {
    constructor({ gun }: Partial<Services>) {
      fn();
      expect(gun).toBeInstanceOf(Gun);
    }
    static dependencies: Array<keyof Services> = ['gun'];
  }

  class Gunlance {
    constructor({ gun }: Partial<Services>) {
      fn();
      expect(gun).toBeInstanceOf(Gun);
    }
    static dependencies: Array<keyof Services> = ['gun'];
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
