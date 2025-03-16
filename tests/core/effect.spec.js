import { proxy, effect, stop, signal, group } from '@lib';

describe('`effect` specification', () => {
  test('should call effect once when called', () => {
    const spy = vi.fn(() => {});
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('should be possible to nest effects', () => {
    let tmp_a = 0;
    let tmp_b = 0;
    let foo = proxy({});

    effect(() => {
      foo.baz;

      tmp_a++;

      effect(() => {
        foo.baz;

        tmp_b++;
      });
    });

    expect(tmp_a).toBe(1);
    expect(tmp_b).toBe(1);

    foo.baz = 5;

    expect(tmp_a).toBe(2);
    expect(tmp_b).toBe(3);
  });

  test('should not be triggered after it was stoped', () => {
    const foo = proxy({ baz: 1 });
    let tmp = 0;

    const e = effect(() => (tmp = foo.baz));

    expect(tmp).toBe(1);
    foo.baz = 2;
    expect(tmp).toBe(2);
    stop(e);
    foo.baz = 5;
    expect(tmp).toBe(2);
  });

  test('should be possible to stop an effect when it is active', () => {
    const foo = proxy({ baz: 0, dir: 0 });

    let effects = [];
    let tmp = 0;

    const e = effect(() => {
      tmp = 0;
      tmp += foo.baz;
      for (const entry of effects) {
        stop(entry);
      }
      tmp += foo.dir;
    });

    effects.push(e);

    expect(tmp).toBe(0);
    foo.baz = 2;
    expect(tmp).toBe(2);
    foo.dir = 2;
    expect(tmp).toBe(2);
  });

  test('effect should be triggered when value is mutated', () => {
    const baz = signal(0);
    const foo = proxy({ baz: 1 });
    const spy = vi.fn(() => (foo.baz, baz.get()));

    effect(spy);

    expect(spy).toBeCalledTimes(1);
    foo.baz = 22;
    expect(spy).toBeCalledTimes(2);
    baz.set(3);
    expect(spy).toBeCalledTimes(3);
  });

  test('should trigger multiple effects if they use the same reactive value', () => {
    const baz = signal(0);
    const foo = proxy({ baz: 3 });

    const spy_a = vi.fn(() => (foo.baz, baz.get()));
    const spy_b = vi.fn(() => (foo.baz, baz.get()));

    effect(spy_a);
    effect(spy_b);

    baz.set(2);
    expect(spy_a).toBeCalledTimes(2);
    expect(spy_b).toBeCalledTimes(2);

    foo.baz = 5;
    expect(spy_a).toBeCalledTimes(3);
    expect(spy_b).toBeCalledTimes(3);
  });

  test('should observe removal of a property with `delete` operator', () => {
    let tmp = 0;
    const foo = proxy({ baz: 1 });
    effect(() => (tmp = foo.baz));
    delete foo.baz;

    expect(tmp).toBe(undefined);
  });

  test('should observe test for a property with `in` operator', () => {
    let tmp = false;

    const foo = proxy({ baz: true });

    effect(() => (tmp = 'baz' in foo));

    expect(tmp).toBe(true);
    delete foo.baz;
    expect(tmp).toBe(false);
  });

  test('should observe getters and setters', () => {
    let _value = 1;
    let tmp = 0;

    const foo = proxy({
      get baz() {
        return _value;
      },
      set baz(v) {
        _value = v;
      },
    });

    effect(() => (tmp = foo.baz));

    expect(tmp).toBe(1);
    foo.baz = 21;
    expect(tmp).toBe(21);
  });

  test('should observe dependencies inside nested function calles', () => {
    let tmp = 0;

    const baz = signal(3);
    const foo = proxy({ baz: 1 });

    effect(() => (() => (tmp = foo.baz + baz.get()))());

    expect(tmp).toBe(4);
    foo.baz = 22;
    expect(tmp).toBe(25);
    baz.set(5);
    expect(tmp).toBe(27);
  });

  test('should subscibe to property with symbolic names', () => {
    let tmp = 0;

    const symbol = Symbol();

    const foo = proxy({ [symbol]: 12 });

    effect(() => (tmp = foo[symbol]));

    expect(tmp).toBe(12);
    foo[symbol] = 123;
    expect(tmp).toBe(123);
    delete foo[symbol];
    expect(tmp).toBe(undefined);
  });

  test('should not subscribe to properties with well known symbolic name', () => {
    let tmp = false;

    const foo = proxy({ [Symbol.iterator]: 12 });

    effect(() => (tmp = foo[Symbol.iterator]));

    expect(foo[Symbol.iterator]).toBe(12);
    expect(tmp).toBe(12);
    foo[Symbol.iterator] = 23;
    expect(tmp).toBe(12);
  });

  test('should subscribe to getters that use context of a proxy object with `this`', () => {
    let tmp = '';

    const foo = proxy({
      raf: 'b',
      get baz() {
        return this.raf;
      },
    });

    effect(() => (tmp = foo.baz));

    expect(tmp).toBe('b');
    foo.raf = 'a';
    expect(tmp).toBe('a');
    delete foo.raf;
    expect(tmp).toBe(undefined);
  });

  describe('cleanup', () => {
    test('should run cleanup callback if it was passed', () => {
      const foo = signal(0);

      let shouldCleanup = true;

      const cleanup = vi.fn(() => {});

      effect(() => {
        foo.get();

        return shouldCleanup ? cleanup : undefined;
      });

      expect(cleanup).not.toBeCalled();
      foo.set(1);
      expect(cleanup).toBeCalledTimes(1);
      shouldCleanup = false;
      foo.set(2);
      expect(cleanup).toBeCalledTimes(2);
      foo.set(3);
      expect(cleanup).toBeCalledTimes(2);
    });
  });

  test('should subscribe to methods that use context with `this`', () => {
    let tmp = '';

    const foo = proxy({
      raf: 'b',
      baz() {
        return this.raf;
      },
    });

    effect(() => (tmp = foo.baz()));

    expect(tmp).toBe('b');
    foo.raf = 'a';
    expect(tmp).toBe('a');
  });

  describe('should not trigger effects if value has not been mutated', () => {
    test('default', () => {
      let tmp = 0;

      const baz = signal(5);
      const foo = proxy({ baz: 2 });
      const spy = vi.fn(() => (tmp = foo.baz + baz.get()));

      effect(spy);

      foo.baz = 2;
      expect(tmp).toBe(7);
      expect(spy).toBeCalledTimes(1);
      baz.set(5);
      expect(spy).toBeCalledTimes(1);
      baz.update(() => 5);
      expect(spy).toBeCalledTimes(1);
    });

    test('`delete` operator', () => {
      const foo = proxy({});
      const spy = vi.fn(() => foo.baz);

      effect(spy);

      expect(spy).toBeCalledTimes(1);
      delete foo.baz;
      expect(spy).toBeCalledTimes(1);
    });

    describe('Map', () => {
      test('set', () => {
        const foo = proxy(new Map([['baz', 'dir']]), false, false);
        const spy = vi.fn(() => foo.get('baz'));

        effect(spy);

        expect(spy).toBeCalledTimes(1);
        foo.set('baz', 'dir');
        expect(spy).toBeCalledTimes(1);
      });

      test('delete', () => {
        const foo = proxy(new Map([]), false, false);
        const spy = vi.fn(() => foo.get('baz'));

        effect(spy);

        expect(spy).toBeCalledTimes(1);
        foo.delete('baz');
        expect(spy).toBeCalledTimes(1);
      });
    });
  });

  test('`signal.update` should always trigger effects if an object returned', () => {
    const value = {};
    const foo = signal(value);

    const spy = vi.fn(() => foo.get());

    effect(spy);

    expect(spy).toBeCalledTimes(1);
    foo.update(() => value);
    expect(spy).toBeCalledTimes(2);
    foo.update(() => null);
    expect(spy).toBeCalledTimes(3);
    foo.update(() => null);
    expect(spy).toBeCalledTimes(3);
  });

  test('should trigger effects if the value has not changed but the property was not previously present', () => {
    const foo = proxy(new Map([]), false, false);
    const spy = vi.fn(() => foo.get('baz'));

    effect(spy);

    expect(spy).toBeCalledTimes(1);
    foo.set('baz', undefined);
    expect(spy).toBeCalledTimes(2);
  });

  test('mutations on raw target must not be observed', () => {
    let tmp = 1;
    const raw = { baz: 2 };
    const foo = proxy(raw);

    effect(() => (tmp = foo.baz));

    raw.baz = 44;
    expect(tmp).toBe(2);
  });

  test('should not observe indirect mutations (in prototype chain)', () => {
    let _value = 'a';
    let tmp = {
      raw: '',
      proxy: '',
    };

    const raw = {};
    const foo = proxy({
      set baz(v) {
        _value = v;
      },
      get baz() {
        return _value;
      },
    });

    Object.setPrototypeOf(raw, foo);

    effect(() => (tmp.raw = raw.baz));
    effect(() => (tmp.proxy = foo.baz));

    expect(tmp.raw).toBe('a');
    expect(tmp.proxy).toBe('a');

    raw.baz = 'b';
    expect(tmp.raw).toBe('a');
    expect(tmp.proxy).toBe('a');
    expect(foo.baz).toBe('b');
  });

  test('must not allow implicit direct recursion', () => {
    const foo = proxy({ baz: 5 });
    const spy = vi.fn(() => foo.baz++);

    effect(spy);

    expect(foo.baz).toBe(6);
    expect(spy).toBeCalledTimes(1);
    foo.baz = 3;
    expect(foo.baz).toBe(4);
    expect(spy).toBeCalledTimes(2);
  });

  test('must not allow implicit indirect recursion', () => {
    const foo = proxy({ baz: 0, raf: 2 });
    const spy_a = vi.fn(() => (foo.baz = foo.raf));
    const spy_b = vi.fn(() => (foo.raf = foo.baz));

    effect(spy_a);
    effect(spy_b);

    expect(foo.baz).toBe(2);
    expect(foo.raf).toBe(2);
    expect(spy_a).toBeCalledTimes(1);
    expect(spy_b).toBeCalledTimes(1);
    foo.baz = 4;
    expect(foo.baz).toBe(4);
    expect(foo.raf).toBe(4);
    expect(spy_a).toBeCalledTimes(2);
    expect(spy_b).toBeCalledTimes(2);
    foo.raf = 3;
    expect(foo.baz).toBe(3);
    expect(foo.raf).toBe(3);
    expect(spy_a).toBeCalledTimes(3);
    expect(spy_b).toBeCalledTimes(3);
  });

  test('must allow explicit indirect recursion', () => {
    const foo = proxy({ baz: 0, raf: 2 });
    const spy_a = vi.fn(() => ++foo.baz < 5 && spy_b());
    const spy_b = vi.fn(() => ++foo.raf < 5 && spy_a());

    effect(spy_a);
    effect(spy_b);

    expect(foo.baz).toBe(4);
    expect(foo.raf).toBe(7);
    expect(spy_a).toBeCalledTimes(4);
    expect(spy_b).toBeCalledTimes(5);
    foo.baz = 3;
    expect(foo.baz).toBe(4);
    expect(foo.raf).toBe(9);
    expect(spy_a).toBeCalledTimes(5);
    expect(spy_b).toBeCalledTimes(7);
  });

  test('must allow explicit direct recursion', () => {
    const foo = proxy({ baz: 5 });
    const spy = vi.fn(() => ++foo.baz < 10 && spy());

    effect(spy);

    expect(foo.baz).toBe(10);
    expect(spy).toBeCalledTimes(5);
    foo.baz = 3;
    expect(foo.baz).toBe(10);
    expect(spy).toBeCalledTimes(12);
  });

  test('should not observer mutations in inactive branches', () => {
    let tmp = 22;

    const foo = proxy({ baz: true, raf: 1 });
    const spy = vi.fn(() => (tmp = foo.baz ? foo.raf : 20));

    effect(spy);

    expect(tmp).toBe(1);
    expect(spy).toBeCalledTimes(1);
    foo.baz = false;
    expect(tmp).toBe(20);
    expect(spy).toBeCalledTimes(2);
    foo.raf = 10;
    expect(tmp).toBe(20);
    expect(spy).toBeCalledTimes(2);
    foo.baz = true;
    expect(tmp).toBe(10);
    expect(spy).toBeCalledTimes(3);
    foo.raf = 2;
    expect(tmp).toBe(2);
    expect(spy).toBeCalledTimes(4);
  });

  test('should call cleanup function when stoped', () => {
    const spy = vi.fn(() => {});

    const e = effect(() => spy);

    stop(e);

    expect(spy).toBeCalledTimes(1);
  });

  test('should be triggered only once if iteration and direct access are both preset', () => {
    const foo = proxy({ baz: 1, raf: 2 });
    const spy = vi.fn(() => {
      for (const key in foo) {
      }

      foo.baz;
    });

    effect(spy);

    expect(spy).toBeCalledTimes(1);
    foo.baz = 4;
    expect(spy).toBeCalledTimes(2);
  });

  test('should be triggered only once if `length` and direct access with index are both preset', () => {
    const foo = proxy(['baz', 'raf']);
    const spy = vi.fn(() => (foo[1], foo.length));

    effect(spy);

    expect(spy).toBeCalledTimes(1);
    foo.shift();
    expect(spy).toBeCalledTimes(2);
  });

  test('should observe `JSON` serialization and deserialization', () => {
    const foo = proxy({ raf: 1, baz: 2, dom: 3 });

    const spy = vi.fn(() => JSON.parse(JSON.stringify(foo)));

    effect(spy);

    expect(spy).toBeCalledTimes(1);
    foo.dom = 50;
    expect(spy).toBeCalledTimes(2);
  });

  test('should subscribe to `for...in` iteration', () => {
    let tmp = '';

    const foo = proxy({ baz: 1 });

    effect(() => {
      tmp = '';
      for (const key in foo) {
        tmp += `${key};`;
      }
    });

    expect(tmp).toBe('baz;');
    foo.raf = 2;
    expect(tmp).toBe('baz;raf;');
    delete foo.baz;
    expect(tmp).toBe('raf;');
  });

  describe('should not trigger effects with iterators if no key was added', () => {
    test('`for...in`', () => {
      const foo = proxy({ baz: 1 });

      const spy = vi.fn(() => {
        for (const key in foo) {
        }
      });

      effect(spy);

      expect(spy).toBeCalledTimes(1);
      foo.baz = 2;
      expect(spy).toBeCalledTimes(1);
      foo.dom = 3;
      expect(spy).toBeCalledTimes(2);
    });

    test('`Object.getOwnPropertyNames`', () => {
      const foo = proxy({ baz: 1 });

      const spy = vi.fn(() => {
        Object.getOwnPropertyNames(foo);
      });

      effect(spy);

      expect(spy).toBeCalledTimes(1);
      foo.baz = 2;
      expect(spy).toBeCalledTimes(1);
      foo.dom = 3;
      expect(spy).toBeCalledTimes(2);
    });

    test('`Object.getOwnPropertySymbols`', () => {
      const foo = proxy({ baz: 1 });

      const spy = vi.fn(() => {
        Object.getOwnPropertySymbols(foo);
      });

      effect(spy);

      expect(spy).toBeCalledTimes(1);
      foo.baz = 2;
      expect(spy).toBeCalledTimes(1);
      foo.dom = 3;
      expect(spy).toBeCalledTimes(2);
    });

    test('`Arra.prototype.forEach`', () => {
      const foo = proxy(['baz']);

      const spy = vi.fn(() => foo.forEach((item) => item));

      effect(spy);

      expect(spy).toBeCalledTimes(1);
      foo.push(1);
      expect(spy).toBeCalledTimes(2);
    });
  });

  test('`pop`, `push`, `shift` and `unshift` should trigger an effect only once', () => {
    const foo = proxy(['baz']);

    const spy = vi.fn(() => (foo[0], foo.length));

    effect(spy);

    expect(spy).toBeCalledTimes(1);
    foo.push(1);
    expect(spy).toBeCalledTimes(2);
    foo.pop();
    expect(spy).toBeCalledTimes(3);
    foo.shift();
    expect(spy).toBeCalledTimes(4);
    foo.unshift(2);
    expect(spy).toBeCalledTimes(5);
  });

  describe('effects with Maps', () => {
    test('should not observe mutations on raw target', () => {
      let tmp = 0;

      const target = new Map();
      const foo = proxy(target);

      effect(() => (tmp = target.get('baz')));

      expect(tmp).toBe(undefined);
      target.set('baz', 3);
      expect(tmp).toBe(undefined);
    });

    test('should observe mutations', () => {
      let tmp = 0;
      const foo = proxy(new Map());

      const spy = vi.fn(() => (tmp = foo.get('baz')));

      effect(spy);

      expect(tmp).toBe(undefined);
      expect(spy).toBeCalledTimes(1);
      foo.set('baz', 23);
      expect(tmp).toBe(23);
      expect(spy).toBeCalledTimes(2);
    });

    test('should observe size mutations', () => {
      let tmp = 1;
      const foo = proxy(new Map());

      foo.size;

      effect(() => (tmp = foo.size));

      foo.set('baz', 1);
      foo.set('raf', 4);
      expect(tmp).toBe(2);
      foo.delete('baz');
      expect(tmp).toBe(1);
      foo.delete('raf');
      expect(tmp).toBe(0);
    });

    test('should observe `for...of` iteration', () => {
      let tmp = 4;
      const foo = proxy(new Map());

      effect(() => {
        tmp = 0;
        for (let [key, value] of foo) {
          tmp += value;
        }
      });

      expect(tmp).toBe(0);
      foo.set('baz', 25);
      foo.set('raf', 5);
      foo.set('dom', 1);
      expect(tmp).toBe(31);
      foo.delete('dom');
      expect(tmp).toBe(30);
      foo.clear();
      expect(tmp).toBe(0);
    });

    test('should observe `for...of` iteration when existing value is mutated', () => {
      let tmp_a = '';
      let tmp_b = 0;

      const foo = proxy(new Map([['raf', 2]]));

      effect(() => {
        tmp_a = '';
        tmp_b = 0;
        for (const [key, value] of foo.entries()) {
          tmp_a += `${key};`;
          tmp_b += value;
        }
      });

      expect(tmp_a).toBe('raf;');
      expect(tmp_b).toBe(2);
      foo.set('baz', 25);
      foo.set('dom', 1);
      expect(tmp_a).toBe('raf;baz;dom;');
      expect(tmp_b).toBe(28);
      foo.delete('dom');
      expect(tmp_a).toBe('raf;baz;');
      expect(tmp_b).toBe(27);
      foo.clear();
      expect(tmp_a).toBe('');
      expect(tmp_b).toBe(0);
    });

    test('should observe `forEach` iteration', () => {
      let tmp = 3;

      const foo = proxy(new Map());

      effect(() => ((tmp = 0), foo.forEach((value) => (tmp += value))));

      expect(tmp).toBe(0);
      foo.set('baz', 25);
      foo.set('raf', 5);
      foo.set('dom', 1);
      expect(tmp).toBe(31);
      foo.delete('dom');
      expect(tmp).toBe(30);
      foo.clear();
      expect(tmp).toBe(0);
    });

    test('should observe `keys` iteration', () => {
      let tmp = '';

      const foo = proxy(new Map([['raf', 2]]));

      effect(() => {
        tmp = '';
        for (const key of foo.keys()) {
          tmp += `${key};`;
        }
      });

      expect(tmp).toBe('raf;');
      foo.set('baz', 25);
      foo.set('dom', 1);
      expect(tmp).toBe('raf;baz;dom;');
      foo.delete('dom');
      expect(tmp).toBe('raf;baz;');
      foo.clear();
      expect(tmp).toBe('');
    });

    test('should observe `values` iteration', () => {
      let tmp = 0;

      const foo = proxy(new Map([['raf', 2]]));

      effect(() => {
        tmp = 0;
        for (const value of foo.values()) {
          tmp += value;
        }
      });

      expect(tmp).toBe(2);
      foo.set('baz', 25);
      foo.set('dom', 1);
      expect(tmp).toBe(28);
      foo.delete('dom');
      expect(tmp).toBe(27);
      foo.clear();
      expect(tmp).toBe(0);
    });

    test('should observe `entries` iteration', () => {
      let tmp_a = '';
      let tmp_b = 0;

      const foo = proxy(new Map([['raf', 2]]));

      effect(() => {
        tmp_a = '';
        tmp_b = 0;
        for (const [key, value] of foo.entries()) {
          tmp_a += `${key};`;
          tmp_b += value;
        }
      });

      expect(tmp_a).toBe('raf;');
      expect(tmp_b).toBe(2);
      foo.set('baz', 25);
      foo.set('dom', 1);
      expect(tmp_a).toBe('raf;baz;dom;');
      expect(tmp_b).toBe(28);
      foo.delete('dom');
      expect(tmp_a).toBe('raf;baz;');
      expect(tmp_b).toBe(27);
      foo.clear();
      expect(tmp_a).toBe('');
      expect(tmp_b).toBe(0);
    });

    test('should observe `clear`', () => {
      let tmp = 0;

      const foo = proxy(new Map([['baz', 1]]));

      effect(() => (tmp = foo.get('baz')));

      expect(tmp).toBe(1);
      foo.clear();
      expect(tmp).toBe(undefined);
    });

    test('should not trigger `Map.prototype.keys` iterator when value of an existing key has changed', () => {
      const foo = proxy(new Map([['baz', 1]]));
      const spy = vi.fn(() => foo.keys());

      effect(spy);

      expect(spy).toBeCalledTimes(1);
      foo.set('baz', 2);
      expect(spy).toBeCalledTimes(1);
    });
  });

  describe('effects with Sets', () => {
    test('should observe mutations', () => {
      let tmp = false;
      const foo = proxy(new Set());

      const spy = vi.fn(() => {
        tmp = foo.has('baz');
      });

      effect(spy);
      expect(tmp).toBe(false);
      expect(spy).toBeCalledTimes(1);
      foo.add('baz');
      expect(tmp).toBe(true);
      expect(spy).toBeCalledTimes(2);
      foo.delete('baz');
      expect(tmp).toBe(false);
      expect(spy).toBeCalledTimes(3);
    });

    test('should observe mutations with proxy values', () => {
      let tmp = false;
      const baz = proxy({});
      const foo = proxy(new Set());

      const spy = vi.fn(() => {
        tmp = foo.has(baz);
      });

      effect(spy);
      expect(tmp).toBe(false);
      expect(spy).toBeCalledTimes(1);
      foo.add(baz);

      expect(tmp).toBe(true);
      expect(spy).toBeCalledTimes(2);
      foo.delete(baz);
      expect(tmp).toBe(false);
      expect(spy).toBeCalledTimes(3);
    });

    test('should observer size mutations', () => {
      let tmp = 1;
      const foo = proxy(new Set());
      effect(() => (tmp = foo.size));

      foo.add('baz');
      foo.add('raf');
      expect(tmp).toBe(2);
      foo.delete('baz');
      expect(tmp).toBe(1);
      foo.delete('raf');
      expect(tmp).toBe(0);
    });

    test('should observe `for...of` iteration', () => {
      let tmp = 4;
      const foo = proxy(new Set());

      effect(() => {
        tmp = 0;
        for (let value of foo) {
          tmp += value;
        }
      });

      expect(tmp).toBe(0);
      foo.add(25);
      foo.add(5);
      foo.add(1);
      expect(tmp).toBe(31);
      foo.delete(1);
      expect(tmp).toBe(30);
      foo.clear();
      expect(tmp).toBe(0);
    });

    test('should observe `forEach` iteration', () => {
      let tmp = 3;

      const foo = proxy(new Set());

      effect(() => ((tmp = 0), foo.forEach((value) => (tmp += value))));

      expect(tmp).toBe(0);
      foo.add(25);
      foo.add(5);
      foo.add(1);
      expect(tmp).toBe(31);
      foo.delete(1);
      expect(tmp).toBe(30);
      foo.clear();
      expect(tmp).toBe(0);
    });

    test('should observe `keys` iteration', () => {
      let tmp = 3;

      const foo = proxy(new Set());

      effect(() => {
        tmp = 0;
        for (const key of foo.keys()) {
          tmp += key;
        }
      });

      expect(tmp).toBe(0);
      foo.add(25);
      foo.add(5);
      foo.add(1);
      expect(tmp).toBe(31);
      foo.delete(1);
      expect(tmp).toBe(30);
      foo.clear();
      expect(tmp).toBe(0);
    });

    test('should observe `values` iteration', () => {
      let tmp = 3;

      const foo = proxy(new Set());

      effect(() => {
        tmp = 0;
        for (const key of foo.values()) {
          tmp += key;
        }
      });

      expect(tmp).toBe(0);
      foo.add(25);
      foo.add(5);
      foo.add(1);
      expect(tmp).toBe(31);
      foo.delete(1);
      expect(tmp).toBe(30);
      foo.clear();
      expect(tmp).toBe(0);
    });

    test('should observe `entries` iteration', () => {
      let tmp_a = 0;
      let tmp_b = 0;

      const foo = proxy(new Set());

      effect(() => {
        tmp_a = 0;
        tmp_b = 0;
        for (const [key, value] of foo.entries()) {
          tmp_a += key;
          tmp_b += value;
        }
      });

      expect(tmp_a).toBe(0);
      expect(tmp_b).toBe(0);
      foo.add(25);
      foo.add(5);
      foo.add(1);
      expect(tmp_a).toBe(31);
      expect(tmp_b).toBe(31);
      foo.delete(1);
      expect(tmp_a).toBe(30);
      expect(tmp_b).toBe(30);
      foo.clear();
      expect(tmp_a).toBe(0);
      expect(tmp_b).toBe(0);
    });

    test('should observe `clear`', () => {
      let tmp = 0;

      const foo = proxy(new Set(['baz']));

      effect(() => (tmp = foo.has('baz')));

      expect(tmp).toBe(true);
      foo.clear();
      expect(tmp).toBe(false);
    });

    test('should not observe mutations on raw target', () => {
      let tmp = false;

      const target = new Set();
      const foo = proxy(target);

      effect(() => (tmp = target.has('baz')));

      expect(tmp).toBe(false);
      target.add('baz');
      expect(tmp).toBe(false);
    });
  });

  test('should not trigger effect with a catched error after a grouping stage', () => {
    const foo = signal(0);

    const spy = vi.fn(() => {
      foo.get();
      throw new Error();
    });

    try {
      effect(spy);
    } catch {}

    expect(spy).toBeCalledTimes(1);
    expect(() => foo.set(1)).toThrow();
    expect(spy).toBeCalledTimes(2);

    group(() => {});

    expect(spy).toBeCalledTimes(2);
  });

  test('should not track values after a catched effect exception', () => {
    const foo = signal(0);
    const baz = signal(0);

    const spy = vi.fn(() => {
      baz.get();
      throw new Error();
    });

    expect(() => effect(spy)).toThrow();

    expect(spy).toBeCalledTimes(1);

    foo.get();

    expect(() => foo.set(1)).not.toThrow();
    expect(spy).toBeCalledTimes(1);
    expect(() => baz.set(1)).toThrow();

    expect(spy).toBeCalledTimes(2);
  });

  test('should not call an effect after it was stopped in a grouping stage', () => {
    let tmp = 0;

    const foo = signal(1);

    group(() => {
      const e = effect(() => (tmp = foo.get()));

      expect(tmp).toBe(0);

      stop(e);
    });

    expect(tmp).toBe(0);
  });

  test('should remove scheduled effects after an error', () => {
    const foo = signal(0);

    let shouldThrow = true;

    const spy_a = vi.fn(() => {
      foo.get();
    });

    const spy_b = vi.fn(() => {
      foo.get();
      if (shouldThrow) throw new Error();
    });

    const spy_c = vi.fn(() => {
      foo.get();
    });

    effect(spy_a);
    expect(() => effect(spy_b)).toThrow();
    effect(spy_c);

    expect(spy_a).toBeCalledTimes(1);
    expect(spy_b).toBeCalledTimes(1);
    expect(spy_c).toBeCalledTimes(1);

    expect(() => foo.set(1)).toThrow();

    expect(spy_a).toBeCalledTimes(2);
    expect(spy_b).toBeCalledTimes(2);
    expect(spy_c).toBeCalledTimes(1);

    shouldThrow = false;

    expect(() => foo.set(2)).not.toThrow();

    expect(spy_a).toBeCalledTimes(3);
    expect(spy_b).toBeCalledTimes(3);
    expect(spy_c).toBeCalledTimes(2);
  });

  describe('Array', () => {
    test('`include` should set dependencies', () => {
      const foo = proxy(['dir', 'baz']);

      const spy = vi.fn(() => {
        foo.includes('dir');
      });

      effect(spy);

      foo[1] = 'bar';
      expect(spy).toBeCalledTimes(1);
      foo[0] = 'div';
      expect(spy).toBeCalledTimes(2);
    });

    test('`indexOf` should set dependencies', () => {
      const foo = proxy(['dir', 'baz']);

      const spy = vi.fn(() => {
        foo.indexOf('dir');
      });

      effect(spy);

      foo[1] = 'bar';
      expect(spy).toBeCalledTimes(1);
      foo[0] = 'div';
      expect(spy).toBeCalledTimes(2);
    });

    test('`lastIndexOf` should set dependencies', () => {
      const foo = proxy(['dir', 'baz']);

      const spy = vi.fn(() => {
        foo.lastIndexOf('dir');
      });

      effect(spy);

      foo[1] = 'bar';
      expect(spy).toBeCalledTimes(2);
      foo[0] = 'div';
      expect(spy).toBeCalledTimes(3);
    });

    test('should observe iterative methods', () => {
      let tmp = '';

      const foo = proxy(['hello']);

      const a = () => {
        tmp = foo.join(' ');
      };

      effect(a);

      expect(tmp).toBe('hello');
      foo.push('world');
      expect(tmp).toBe('hello world');
      foo.shift();
      expect(tmp).toBe('world');
      foo.unshift('hello');
      expect(tmp).toBe('hello world');
      foo.pop();
      expect(tmp).toBe('hello');
    });

    test('should observe implicit length changes', () => {
      let tmp = '';

      const foo = proxy(['hello']);

      effect(() => (tmp = foo.join(' ')));

      expect(tmp).toBe('hello');
      foo[1] = 'world';
      expect(tmp).toBe('hello world');
      foo[3] = 'horay!';
      expect(tmp).toBe('hello world  horay!');
    });

    test('should observe mutations in a sparse array', () => {
      let tmp = '';

      const foo = proxy([]);
      foo[1] = 'world';

      effect(() => (tmp = foo.join(' ')));

      expect(tmp).toBe(' world');
      foo[0] = 'hello';
      expect(tmp).toBe('hello world');
    });

    describe('methods that use `length` internally should not cause tracking and infinite loops', () => {
      test('push', () => {
        const foo = proxy([]);
        const spy = vi.fn(() => foo.push(1));

        effect(spy);

        expect(spy).toBeCalledTimes(1);
      });

      test('pop', () => {
        const foo = proxy([1]);
        const spy = vi.fn(() => foo.pop());

        effect(spy);

        expect(spy).toBeCalledTimes(1);
      });

      test('unshift', () => {
        const foo = proxy([]);
        const spy = vi.fn(() => foo.unshift(1));

        effect(spy);

        expect(spy).toBeCalledTimes(1);
      });

      test('shift', () => {
        const foo = proxy([1]);
        const spy = vi.fn(() => foo.shift(1));

        effect(spy);

        expect(spy).toBeCalledTimes(1);
      });
    });

    describe('length mutation', () => {
      test('should trigger for all dependencies with index >= than mutated length', () => {
        const foo = proxy(['raf', 'baz', 'bar', 'dom']);

        const spy_a = vi.fn(() => foo[2]);
        const spy_b = vi.fn(() => foo[3]);

        effect(spy_a);
        effect(spy_b);

        expect(spy_a).toBeCalledTimes(1);
        expect(spy_b).toBeCalledTimes(1);

        foo.length = 3;

        expect(spy_a).toBeCalledTimes(1);
        expect(spy_b).toBeCalledTimes(2);
      });

      test('should trigger for all dependencies with index >= than mutated length when length is set with string', () => {
        const foo = proxy(['raf', 'baz', 'bar', 'dom']);
        const spy_a = vi.fn(() => foo[2]);
        const spy_b = vi.fn(() => foo[3]);
        effect(spy_a);
        effect(spy_b);

        expect(spy_a).toBeCalledTimes(1);
        expect(spy_b).toBeCalledTimes(1);
        foo.length = '3';
        expect(spy_a).toBeCalledTimes(1);
        expect(spy_b).toBeCalledTimes(2);
      });
    });

    test('`unshift` and `shift` should trigger mutations only once', () => {
      const foo = proxy(['baz', 'dir', 'div']);

      const spy = vi.fn(() => {
        for (const v of foo) {
        }
      });

      effect(spy);

      expect(spy).toBeCalledTimes(1);
      foo.unshift('bar');
      expect(spy).toBeCalledTimes(2);
      foo.shift('bar');
      expect(spy).toBeCalledTimes(3);
    });
  });
});
