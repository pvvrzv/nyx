import { signal, effect, proxy, computed } from '@lib';

describe('`signal` specification', () => {
  test('should be able to get and set a value', () => {
    const foo = signal(0);

    expect(foo.get()).toBe(0);
    foo.set(3);
    expect(foo.get()).toBe(3);
  });

  test('should be reactive', () => {
    let tmp = 0;
    const foo = signal(2);
    const spy = vi.fn(() => (tmp = foo.get()));

    effect(spy);

    expect(tmp).toBe(2);
    foo.set(3);
    expect(tmp).toBe(3);
  });

  test('should work without passing a value', () => {
    let tmp = 0;
    const foo = signal();
    const spy = vi.fn(() => (tmp = foo.get()));

    effect(spy);

    expect(tmp).toBe(undefined);
    foo.set(3);
    expect(tmp).toBe(3);
  });

  test('should not wrap a signal', () => {
    const foo = signal(0);
    const baz = signal(foo);

    expect(baz).toBe(foo);
  });

  test('should not proxy a value', () => {
    const target = {};
    const baz = proxy(target);
    const foo = signal(target);

    expect(foo.get()).toBe(target);
    expect(foo.get()).not.toBe(baz);
  });

  test('should not unwrap signal inside a proxy', () => {
    const foo = signal(0);
    const pro = proxy({ foo });

    expect(pro.foo).toBe(foo);
  });

  test('should update a value when calling `update` method', () => {
    const foo = signal(0);

    expect(foo.get()).toBe(0);

    foo.update((v) => v + 3);

    expect(foo.get()).toBe(3);
  });

  test('should trigger effect when calling `update` method', () => {
    const foo = signal(0);

    let tmp;

    effect(() => {
      tmp = foo.get();
    });

    expect(tmp).toBe(0);

    foo.update((v) => v + 1);

    expect(tmp).toBe(1);
  });

  test('computed should be updated when dependencies udpate', () => {
    const baz = signal(0);
    const dir = proxy({ zoo: 1 });

    const foo = computed(() => baz.get() + dir.zoo);

    expect(foo.get()).toBe(1);
    dir.zoo = 12;
    expect(foo.get()).toBe(12);
    baz.set(2);
    expect(foo.get()).toBe(14);
  });

  test('should be possible to set computed explicitly', () => {
    const baz = signal(0);
    const dir = proxy({ zoo: 1 });

    const foo = computed(() => baz.get() + dir.zoo);

    expect(foo.get()).toBe(1);
    foo.set(0);
    expect(foo.get()).toBe(0);
  });

  test('computed signal should trigger effects', () => {
    const baz = signal(0);
    const dir = proxy({ zoo: 1 });

    const foo = computed(() => baz.get() + dir.zoo);

    let tmp;

    effect(() => (tmp = foo.get()));

    expect(tmp).toBe(1);
    dir.zoo = 10;
    expect(tmp).toBe(10);
    baz.set(1);
    expect(tmp).toBe(11);
  });

  test('update method should return updated value', () => {
    const foo = signal(0);

    expect(foo.update((v) => v + 1)).toBe(1);
  });
});
