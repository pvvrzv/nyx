import { raw, proxy } from '@lib';

describe('`raw` specification', () => {
  test('should return raw target', () => {
    const target_a = {};
    const target_b = [];
    const target_c = new Map();
    const target_d = new WeakMap();
    const target_e = new Set();
    const target_f = new WeakSet();

    raw(target_a);

    expect(raw(proxy(target_a, false, false))).toBe(target_a);
    expect(raw(proxy(target_b, false, false))).toBe(target_b);
    expect(raw(proxy(target_c, false, false))).toBe(target_c);
    expect(raw(proxy(target_d, false, false))).toBe(target_d);
    expect(raw(proxy(target_e, false, false))).toBe(target_e);
    expect(raw(proxy(target_f, false, false))).toBe(target_f);
  });

  test('should return argument if it is not a registered proxy', () => {
    const foo = {};
    const baz = [];
    const dir = new Map();
    const npm = new Set();
    const cdn = new Proxy({}, {});

    expect(raw(foo)).toBe(foo);
    expect(raw(baz)).toBe(baz);
    expect(raw(dir)).toBe(dir);
    expect(raw(npm)).toBe(npm);
    expect(raw(cdn)).toBe(cdn);
    expect(raw(2)).toBe(2);
    expect(raw('')).toBe('');
    expect(raw(Symbol.for('foo'))).toBe(Symbol.for('foo'));
  });

  test('should return argument if not called directly on a proxy', () => {
    const foo_a = {};
    const foo_b = {};
    const foo_c = {};
    const foo_d = {};
    const foo_e = {};
    const foo_f = {};

    Object.setPrototypeOf(foo_a, proxy({}, false, false));
    Object.setPrototypeOf(foo_b, proxy([], false, false));
    Object.setPrototypeOf(foo_c, proxy(new Map(), false, false));
    Object.setPrototypeOf(foo_d, proxy(new Set(), false, false));
    Object.setPrototypeOf(foo_e, proxy(new WeakMap(), false, false));
    Object.setPrototypeOf(foo_f, proxy(new WeakSet(), false, false));

    expect(raw(foo_a)).toBe(foo_a);
    expect(raw(foo_b)).toBe(foo_b);
    expect(raw(foo_c)).toBe(foo_c);
    expect(raw(foo_d)).toBe(foo_d);
    expect(raw(foo_e)).toBe(foo_e);
    expect(raw(foo_f)).toBe(foo_f);
  });
});
