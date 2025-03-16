import { proxy, effect, raw, $$readonly, $$raw, $$shallow } from '@lib';
import { setConstantValue } from 'typescript';
import { describe } from 'vitest';

describe('`proxy` specification', () => {
  describe('readonly', () => {
    test('should return new readonly proxy when writable proxy is passed as an argument', () => {
      const raw = {};
      const writable = proxy(raw, false, false);
      const readonly = proxy(writable, true, false);

      expect(readonly).not.toBe(writable);
      expect(readonly).not.toBe(raw);
    });

    test('should not allow mutations', () => {
      const object = proxy({ baz: 1 }, true, false);
      const array = proxy([], true, false);
      const map = proxy(new Map(), true, false);
      const set = proxy(new Set(), true, false);
      const weakmap = proxy(new WeakMap(), true, false);
      const weakset = proxy(new WeakSet(), true, false);

      expect(() => (object.baz = 2)).toThrow();
      expect(() => (array[2] = 3)).toThrow();
      expect(() => (map.dir = 1)).toThrow();
      expect(() => (set.dir = 1)).toThrow();
      expect(() => map.set('foo', 2)).toThrow();
      expect(() => set.add(3)).toThrow();
      expect(() => set.clear()).toThrow();
      expect(() => map.clear()).toThrow();
      expect(() => (weakmap.dir = 1)).toThrow();
      expect(() => (weakset.dir = 1)).toThrow();
      expect(() => weakmap.set('foo', 2)).toThrow();
      expect(() => weakset.add(3)).toThrow();
      expect(() => weakset.clear()).toThrow();
      expect(() => weakmap.clear()).toThrow();
      expect(() => (array.size = 2)).toThrow();
      expect(() => delete object.baz).toThrow();
      expect(() => delete array[2]).toThrow();
      expect(() => delete map.dir).toThrow();
      expect(() => delete set.dir).toThrow();
      expect(() => delete weakmap.dir).toThrow();
      expect(() => delete weakset.dir).toThrow();
    });

    test('should not trigger effects', () => {
      const object = proxy({ baz: 1 }, true, false);
      const array = proxy([], true, false);
      const map = proxy(new Map(), true, false);
      const set = proxy(new Set(), true, false);
      const weakmap = proxy(new WeakMap(), true, false);
      const weakset = proxy(new WeakSet(), true, false);

      const spy = vi.fn(() => (object.baz, array[0], map.size, set.size));

      effect(spy);

      expect(spy).toBeCalledTimes(1);

      expect(() => (object.baz = 2)).toThrow();
      expect(() => (array[2] = 3)).toThrow();
      expect(() => (map.dir = 1)).toThrow();
      expect(() => (set.dir = 1)).toThrow();
      expect(() => map.set('foo', 2)).toThrow();
      expect(() => set.add(3)).toThrow();
      expect(() => set.clear()).toThrow();
      expect(() => map.clear()).toThrow();
      expect(() => (weakmap.dir = 1)).toThrow();
      expect(() => (weakset.dir = 1)).toThrow();
      expect(() => weakmap.set('foo', 2)).toThrow();
      expect(() => weakset.add(3)).toThrow();
      expect(() => weakset.clear()).toThrow();
      expect(() => weakmap.clear()).toThrow();
      expect(() => (array.size = 2)).toThrow();
      expect(() => delete object.baz).toThrow();
      expect(() => delete array[2]).toThrow();
      expect(() => delete map.dir).toThrow();
      expect(() => delete set.dir).toThrow();
      expect(() => delete weakmap.dir).toThrow();
      expect(() => delete weakset.dir).toThrow();

      expect(spy).toBeCalledTimes(1);
    });
  });

  test('should be possible to detect a proxy', () => {
    expect(proxy.is(proxy({}, false, false))).toBe(true);
    expect(proxy.is(proxy([], false, false))).toBe(true);
    expect(proxy.is(proxy(new Map(), false, false))).toBe(true);
    expect(proxy.is(proxy(new WeakMap(), false, false))).toBe(true);
    expect(proxy.is(proxy(new Set(), false, false))).toBe(true);
    expect(proxy.is(proxy(new WeakSet(), false, false))).toBe(true);

    expect(proxy.is(proxy({}, true, false))).toBe(true);
    expect(proxy.is(proxy([], true, false))).toBe(true);
    expect(proxy.is(proxy(new Map(), true, false))).toBe(true);
    expect(proxy.is(proxy(new WeakMap(), true, false))).toBe(true);
    expect(proxy.is(proxy(new Set(), true, false))).toBe(true);
    expect(proxy.is(proxy(new WeakSet(), true, false))).toBe(true);

    expect(proxy.is(proxy({}, false, true))).toBe(true);
    expect(proxy.is(proxy([], false, true))).toBe(true);
    expect(proxy.is(proxy(new Map(), false, true))).toBe(true);
    expect(proxy.is(proxy(new WeakMap(), false, true))).toBe(true);
    expect(proxy.is(proxy(new Set(), false, true))).toBe(true);
    expect(proxy.is(proxy(new WeakSet(), false, true))).toBe(true);

    expect(proxy.is(proxy({}, true, true))).toBe(true);
    expect(proxy.is(proxy([], true, true))).toBe(true);
    expect(proxy.is(proxy(new Map(), true, true))).toBe(true);
    expect(proxy.is(proxy(new WeakMap(), true, true))).toBe(true);
    expect(proxy.is(proxy(new Set(), true, true))).toBe(true);
    expect(proxy.is(proxy(new WeakSet(), true, true))).toBe(true);
  });

  test('should return proxy of an appropriate type for nested values', () => {
    const validate = (value, isProxy, readonly, shallow) => {
      expect(proxy.is(value)).toBe(isProxy);

      if (!isProxy) return;

      expect(value[$$readonly]).toBe(readonly);
      expect(value[$$shallow]).toBe(shallow);
    };

    validate(proxy({ foo: {} }, false, false).foo, true, false, false);
    validate(proxy({ foo: {} }, false, true).foo, false, false, true);
    validate(proxy({ foo: {} }, true, true).foo, false, true, true);
    validate(proxy({ foo: {} }, true, false).foo, true, true, false);

    validate(proxy(new Map([['foo', {}]]), false, false).get('foo'), true, false, false);
    validate(proxy(new Map([['foo', {}]]), false, true).get('foo'), false, false, true);
    validate(proxy(new Map([['foo', {}]]), true, true).get('foo'), false, false, false);
    validate(proxy(new Map([['foo', {}]]), true, false).get('foo'), true, true, false);

    const key = {};

    validate(proxy(new WeakMap([[key, {}]]), false, false).get(key), true, false, false);
    validate(proxy(new WeakMap([[key, {}]]), false, true).get(key), false, false, true);
    validate(proxy(new WeakMap([[key, {}]]), true, true).get(key), false, false, false);
    validate(proxy(new WeakMap([[key, {}]]), true, false).get(key), true, true, false);
  });

  describe('should return proxy of an appropriate type for nested values with collection iterators', () => {
    const validate = (value, isProxy, readonly, shallow) => {
      expect(proxy.is(value)).toBe(isProxy);

      if (!isProxy) return;

      expect(value[$$readonly]).toBe(readonly);
      expect(value[$$shallow]).toBe(shallow);
    };

    const signle = (method, collection) => {
      for (const value of proxy(collection, false, false)[method]()) {
        validate(value, true, false, false);
      }

      for (const value of proxy(collection, false, true)[method]()) {
        validate(value, false, false, false);
      }

      for (const value of proxy(collection, true, false)[method]()) {
        validate(value, true, true, false);
      }

      for (const value of proxy(collection, true, true)[method]()) {
        validate(value, false, true, true);
      }
    };

    const entries = (collection) => {
      for (const [key, value] of proxy(collection, false, false).entries()) {
        validate(key, true, false, false);
        validate(value, true, false, false);
      }

      for (const [key, value] of proxy(collection, false, true).entries()) {
        validate(key, false, false, false);
        validate(value, false, true, true, false);
      }

      for (const [key, value] of proxy(collection, true, false).entries()) {
        validate(key, true, true, false);
        validate(value, true, true, false);
      }

      for (const [key, value] of proxy(collection, true, true).entries()) {
        validate(key, false, true, true);
        validate(value, false, true, true);
      }
    };

    test('set keys', () => {
      signle('keys', new Set([{}]));
    });

    test('set values', () => {
      signle('values', new Set([{}]));
    });

    test('map keys', () => {
      signle('keys', new Map([[{}, {}]]));
    });

    test('map values', () => {
      signle('values', new Map([[{}, {}]]));
    });

    test('set entries', () => {
      entries(new Set([{}]));
    });

    test('map entries', () => {
      entries(new Map([[{}, {}]]));
    });
  });

  describe('should be possible to proxy targets of type: ', () => {
    const targets = [{}, new Map(), new WeakMap(), new Set(), new WeakSet(), []];

    for (const target of targets) {
      test(Object.prototype.toString.call(target).slice(8, -1), () => {
        const foo = proxy(target, false, false);

        expect(foo).not.toBe(target);
        expect(raw(foo)).toBe(target);
      });
    }
  });

  describe('proxy flags', () => {
    test('$$readonly', () => {
      expect(proxy(new Map(), true, true)[$$readonly]).toBe(true);
      expect(proxy(new Set(), true, true)[$$readonly]).toBe(true);
      expect(proxy(new WeakMap(), true, true)[$$readonly]).toBe(true);
      expect(proxy(new WeakSet(), true, true)[$$readonly]).toBe(true);
      expect(proxy({}, true, true)[$$readonly]).toBe(true);
      expect(proxy([], true, true)[$$readonly]).toBe(true);

      expect(proxy(new Map(), true, false)[$$readonly]).toBe(true);
      expect(proxy(new Set(), true, false)[$$readonly]).toBe(true);
      expect(proxy(new WeakMap(), true, false)[$$readonly]).toBe(true);
      expect(proxy(new WeakSet(), true, false)[$$readonly]).toBe(true);
      expect(proxy({}, true, false)[$$readonly]).toBe(true);
      expect(proxy([], true, false)[$$readonly]).toBe(true);

      expect(proxy(new Map(), false, true)[$$readonly]).toBe(false);
      expect(proxy(new Set(), false, true)[$$readonly]).toBe(false);
      expect(proxy(new WeakMap(), false, true)[$$readonly]).toBe(false);
      expect(proxy(new WeakSet(), false, true)[$$readonly]).toBe(false);
      expect(proxy({}, false, true)[$$readonly]).toBe(false);
      expect(proxy([], false, true)[$$readonly]).toBe(false);

      expect(proxy(new Map(), false, false)[$$readonly]).toBe(false);
      expect(proxy(new Set(), false, false)[$$readonly]).toBe(false);
      expect(proxy(new WeakMap(), false, false)[$$readonly]).toBe(false);
      expect(proxy(new WeakSet(), false, false)[$$readonly]).toBe(false);
      expect(proxy({}, false, false)[$$readonly]).toBe(false);
      expect(proxy([], false, false)[$$readonly]).toBe(false);
    });

    test('$$shallow', () => {
      expect(proxy(new Map(), true, true)[$$shallow]).toBe(true);
      expect(proxy(new Set(), true, true)[$$shallow]).toBe(true);
      expect(proxy(new WeakMap(), true, true)[$$shallow]).toBe(true);
      expect(proxy(new WeakSet(), true, true)[$$shallow]).toBe(true);
      expect(proxy({}, true, true)[$$shallow]).toBe(true);
      expect(proxy([], true, true)[$$shallow]).toBe(true);

      expect(proxy(new Map(), false, true)[$$shallow]).toBe(true);
      expect(proxy(new Set(), false, true)[$$shallow]).toBe(true);
      expect(proxy(new WeakMap(), false, true)[$$shallow]).toBe(true);
      expect(proxy(new WeakSet(), false, true)[$$shallow]).toBe(true);
      expect(proxy({}, false, true)[$$shallow]).toBe(true);
      expect(proxy([], false, true)[$$shallow]).toBe(true);

      expect(proxy(new Map(), true, false)[$$shallow]).toBe(false);
      expect(proxy(new Set(), true, false)[$$shallow]).toBe(false);
      expect(proxy(new WeakMap(), true, false)[$$shallow]).toBe(false);
      expect(proxy(new WeakSet(), true, false)[$$shallow]).toBe(false);
      expect(proxy({}, true, false)[$$shallow]).toBe(false);

      expect(proxy([], false, false)[$$shallow]).toBe(false);
      expect(proxy(new Map(), false, false)[$$shallow]).toBe(false);
      expect(proxy(new Set(), false, false)[$$shallow]).toBe(false);
      expect(proxy(new WeakMap(), false, false)[$$shallow]).toBe(false);
      expect(proxy(new WeakSet(), false, false)[$$shallow]).toBe(false);
      expect(proxy({}, false, false)[$$shallow]).toBe(false);
      expect(proxy([], false, false)[$$shallow]).toBe(false);
    });
  });

  describe('should be possible to proxy targets that extend: ', () => {
    const targets = [Object, Map, WeakMap, Set, WeakSet, Array];

    for (const Target of targets) {
      test(Object.prototype.toString.call(Target).slice(8, -1), () => {
        class Extended extends Target {}
        const extended = new Extended();
        const foo = proxy(extended);

        expect(raw(foo)).toBe(extended);
      });
    }
  });

  test('should proxy nested properties', () => {
    const nested = {};
    const target = { nested };
    const foo = proxy(target, false, false);

    expect(foo.nested).to.toBe(proxy(nested));
    expect(raw(foo.nested)).toBe(nested);
  });

  test('should update value on target', () => {
    const target = {};
    const foo = proxy(target, false, false);

    foo.a = 22;
    expect(target.a).toBe(22);
  });

  test('should not proxy a proxy of the same type', () => {
    const dw = proxy({}, false, false);
    const dr = proxy({}, true, false);
    const sw = proxy({}, false, true);
    const sr = proxy({}, true, true);

    expect(proxy(dw, false, false)).toBe(dw);
    expect(proxy(dr, true, false)).toBe(dr);
    expect(proxy(sw, false, true)).toBe(sw);
    expect(proxy(sr, true, true)).toBe(sr);
  });

  test('should return a new proxy of a target if proxy of another type is passed as an argument', () => {
    const dw = proxy({}, false, false);
    const dr = proxy({}, true, false);
    const sw = proxy({}, false, true);
    const sr = proxy({}, true, true);

    expect(proxy(dw, false, true)).not.toBe(dw);
    expect(proxy(dw, true, true)).not.toBe(dw);

    expect(proxy(dr, false, true)).not.toBe(dr);
    expect(proxy(dr, true, true)).not.toBe(dr);

    expect(proxy(sw, false, false)).not.toBe(sw);
    expect(proxy(sw, true, false)).not.toBe(sw);

    expect(proxy(sr, false, false)).not.toBe(sr);
    expect(proxy(sr, true, false)).not.toBe(sr);
  });

  test('proxy of a proxy should use target object as a target', () => {
    const dw = proxy({}, false, false);
    const dr = proxy({}, true, false);
    const sw = proxy({}, false, true);
    const sr = proxy({}, true, true);

    expect(raw(proxy(dw, false, true))).not.toBe(dw);
    expect(raw(proxy(dw, true, true))).not.toBe(dw);

    expect(raw(proxy(dr, false, true))).not.toBe(dr);
    expect(raw(proxy(dr, true, true))).not.toBe(dr);

    expect(raw(proxy(sw, false, false))).not.toBe(sw);
    expect(raw(proxy(sw, true, false))).not.toBe(sw);

    expect(raw(proxy(sr, false, false))).not.toBe(sr);
    expect(raw(proxy(sr, true, false))).not.toBe(sr);

    expect(raw(proxy(dw, false, true))).toBe(raw(dw));
    expect(raw(proxy(dw, true, true))).toBe(raw(dw));

    expect(raw(proxy(dr, false, true))).toBe(raw(dr));
    expect(raw(proxy(dr, true, true))).toBe(raw(dr));

    expect(raw(proxy(sw, false, false))).toBe(raw(sw));
    expect(raw(proxy(sw, true, false))).toBe(raw(sw));

    expect(raw(proxy(sr, false, false))).toBe(raw(sr));
    expect(raw(proxy(sr, true, false))).toBe(raw(sr));
  });

  test('should not proxy non-extensible target', () => {
    const target = Object.preventExtensions({});
    expect(proxy(target, false, false)).toBe(target);
  });

  describe('should not pollute target with proxies', () => {
    test('Map', () => {
      const target = new Map();
      const foo = proxy(target, false, false);
      const value = proxy({}, false, false);

      foo.set('baz', value);

      expect(target.get('baz')).toBe(raw(value));
      expect(target.get('baz')).not.toBe(value);

      foo.set(value, value);
      expect(target.has(value)).toBe(false);
    });

    test('Set', () => {
      const target = new Set();
      const foo = proxy(target, false, false);
      const value = proxy({}, false, false);

      foo.add(value);

      expect(target.has(value)).toBe(false);
      expect(foo.has(value)).toBe(true);
    });

    test('object', () => {
      const target = {};
      const foo = proxy(target, false, false);
      const value = proxy({}, false, false);

      foo.baz = value;

      expect(target.baz).toBe(raw(value));
      expect(target.baz).not.toBe(value);
    });

    test('Array', () => {
      const target = [];
      const foo = proxy(target, false, false);
      const value = proxy({}, false, false);

      foo[0] = value;

      expect(target[0]).toBe(raw(value));
      expect(target[0]).not.toBe(value);
    });

    test('Array `push` and `unshift` methods', () => {
      const target = [];
      const foo = proxy(target, false, false);
      const value = proxy({}, false, false);

      foo.unshift(value);

      expect(target[0]).toBe(raw(value));
      expect(target[0]).not.toBe(value);

      foo.push(value);

      expect(target[1]).toBe(raw(value));
      expect(target[1]).not.toBe(value);
    });
  });

  describe('should set proxies as values for shallow proxies', () => {
    test('Map', () => {
      const target = new Map();
      const foo = proxy(target, false, true);
      const value = proxy({}, false, false);

      foo.set('baz', value);

      expect(target.get('baz')).toBe(value);
      expect(target.get('baz')).not.toBe(raw(value));

      foo.set(value, value);
      expect(target.has(value)).toBe(false);
      expect(target.has(raw(value))).toBe(true);
      expect(target.get(raw(value))).toBe(value);
    });

    test('Set', () => {
      const target = new Set();
      const foo = proxy(target, false, true);
      const value = proxy({}, false, false);

      foo.add(value);

      expect(target.has(value)).toBe(true);
    });

    test('object', () => {
      const target = {};
      const foo = proxy(target, false, true);
      const value = proxy({}, false, false);

      foo.baz = value;

      expect(target.baz).toBe(value);
      expect(target.baz).not.toBe(raw(value));
    });

    test('Array', () => {
      const target = [];
      const foo = proxy(target, false, true);
      const value = proxy({}, false, false);

      foo[0] = value;

      expect(target[0]).toBe(value);
      expect(target[0]).not.toBe(raw(value));
    });

    test('Array `push` and `unshift` methods', () => {
      const target = [];
      const foo = proxy(target, false, true);
      const value = proxy({}, false, false);

      foo.unshift(value);

      expect(target[0]).toBe(value);
      expect(target[0]).not.toBe(raw(value));

      foo.push(value);

      expect(target[1]).toBe(value);
      expect(target[1]).not.toBe(raw(value));
    });
  });

  describe('Map', () => {
    test('should return proxy version of a value', () => {
      const foo = proxy(new Map(), false, false);
      const value = {};
      const p = proxy(value, false, false);

      foo.set('baz', value);

      expect(foo.get('baz')).toBe(p);
    });

    test('should not diffirentiate between readonly and writable keys for Map and WeakMap', () => {
      const raw = {};
      const readonly = proxy(raw, true, false);
      const writable = proxy(raw, false, false);

      const map = proxy(new Map(), false, true);
      const weakmap = proxy(new WeakMap(), false, true);

      map.set(readonly, 2);
      expect(map.get(writable)).toBe(2);
      map.set(writable, 5);
      expect(map.get(readonly)).toBe(5);

      weakmap.set(readonly, 2);
      expect(weakmap.get(writable)).toBe(2);
      weakmap.set(writable, 5);
      expect(weakmap.get(readonly)).toBe(5);
    });

    describe('iterators should return proxy values', () => {
      test('`Map.prototype.forEach`', () => {
        const foo = proxy(new Map([['baz', {}]]), false, false);

        foo.forEach((value) => expect(proxy.is(value)).toBe(true));
        foo.set('raf', {});
        foo.forEach((value) => expect(proxy.is(value)).toBe(true));
      });

      test('`Map.prototype.values`', () => {
        const foo = proxy(new Map([['baz', {}]]), false, false);

        for (const value of foo.values()) {
          expect(proxy.is(value)).toBe(true);
        }

        foo.set('raf', {});

        for (const value of foo.values()) {
          expect(proxy.is(value)).toBe(true);
        }
      });

      test('`Map.prototype.entries`', () => {
        const foo = proxy(new Map([['baz', {}]]), false, false);

        for (const [key, value] of foo.entries()) {
          expect(proxy.is(value)).toBe(true);
        }

        foo.set('raf', {});

        for (const [key, value] of foo.entries()) {
          expect(proxy.is(value)).toBe(true);
        }
      });

      test('`for...of`', () => {
        const foo = proxy(new Map([['baz', {}]]), false, false);

        for (const [key, value] of foo) {
          expect(proxy.is(value)).toBe(true);
        }

        foo.set('raf', {});

        for (const [key, value] of foo.entries()) {
          expect(proxy.is(value)).toBe(true);
        }
      });
    });

    test('should be possible to use reacitve objects as keys', () => {
      const baz = proxy({}, false, false);
      const foo = proxy(new Map([[baz, 1]]), false, false);

      expect(foo.has(baz)).toBe(true);
      expect(foo.get(baz)).toBe(1);
      expect(foo.delete(baz)).toBe(true);
      expect(foo.has(baz)).toBe(false);
      expect(foo.get(baz)).toBe(undefined);
    });

    test('should not diffirentiate between proxy and non-proxy key for `Map.prototype.delete`', () => {
      const key = {};
      const baz = proxy(key, false, false);
      const foo = proxy(new Map([[key, 1]]), false, false);

      expect(foo.get(key)).toBe(1);
      expect(foo.get(baz)).toBe(1);
      expect(foo.delete(baz)).toBe(true);
      expect(foo.get(key)).toBe(undefined);
      expect(foo.get(baz)).toBe(undefined);
    });

    test('should not diffirentiate between proxy and non-proxy key for `Map.prototype.has`', () => {
      const key = {};
      const baz = proxy(key, false, false);
      const foo = proxy(new Map([[key, 1]]), false, false);

      expect(foo.has(key)).toBe(true);
      expect(foo.has(baz)).toBe(true);
    });
  });

  describe('Set', () => {
    describe('iterators should return proxy values', () => {
      test('`Set.prototype.forEach`', () => {
        const foo = proxy(new Set([{}]), false, false);

        foo.forEach((value) => expect(proxy.is(value)).toBe(true));
        foo.add({});
        foo.forEach((value) => expect(proxy.is(value)).toBe(true));
      });

      test('`Set.prototype.values`', () => {
        const foo = proxy(new Set([{}]), false, false);

        for (const value of foo.values()) {
          expect(proxy.is(value)).toBe(true);
        }

        foo.add({});

        for (const value of foo.values()) {
          expect(proxy.is(value)).toBe(true);
        }
      });

      test('`Set.prototype.entries`', () => {
        const foo = proxy(new Set([{}]), false, false);

        for (const [key, value] of foo.entries()) {
          expect(proxy.is(key)).toBe(true);
          expect(proxy.is(value)).toBe(true);
        }

        foo.add({});

        for (const [key, value] of foo.entries()) {
          expect(proxy.is(key)).toBe(true);
          expect(proxy.is(value)).toBe(true);
        }
      });

      test('`for...of`', () => {
        const foo = proxy(new Set([{}]), false, false);

        for (const value of foo) {
          expect(proxy.is(value)).toBe(true);
        }

        foo.add({});

        for (const value of foo) {
          expect(proxy.is(value)).toBe(true);
        }
      });
    });

    test('should accept custom context (`this`) for `Set.prototype.forEach`', () => {
      let tmp = 0;
      const foo = proxy(new Set(['baz']), false, false);
      const thisArg = {};

      foo.forEach(function (value, _, context) {
        tmp++;
        expect(this).toBe(thisArg);
        expect(value).toBe('baz');
        expect(context).toBe(foo);
      }, thisArg);

      expect(tmp).toBe(1);
    });

    describe('Array', () => {
      test('identity methods should not diffirentiate between proxied and raw values', () => {
        const raw = {};
        const proxied = proxy(raw, false, false);
        const foo = proxy([raw], false, false);

        expect(foo.indexOf(raw)).toBe(0);
        expect(foo.indexOf(proxied)).toBe(0);
        expect(foo.lastIndexOf(raw)).toBe(0);
        expect(foo.lastIndexOf(proxied)).toBe(0);
        expect(foo.includes(raw)).toBe(true);
        expect(foo.includes(proxied)).toBe(true);
      });
    });
  });
});
