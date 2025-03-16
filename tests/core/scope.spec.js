import { effect, scope, proxy, signal, computed, stop } from '@lib';

describe('`scope` specification', () => {
  test('shold be possible to scope effects', () => {
    const foo = proxy({ baz: 0, bar: 0, dir: 0 });

    let tmp_a = 0;
    let tmp_b = 0;
    let tmp_c = 0;

    const s = scope();

    s(() => {
      effect(() => (tmp_a = foo.baz));
      effect(() => (tmp_b = foo.bar));
      effect(() => (tmp_c = foo.dir));
    });

    foo.baz = 1;
    foo.bar = 2;
    foo.dir = 3;

    expect(tmp_a).toBe(1);
    expect(tmp_b).toBe(2);
    expect(tmp_c).toBe(3);

    stop(s);

    foo.baz = 4;
    foo.bar = 5;
    foo.dir = 6;

    expect(tmp_a).toBe(1);
    expect(tmp_b).toBe(2);
    expect(tmp_c).toBe(3);
  });

  test('should not scope running effects', () => {
    const baz = proxy({});
    const foo = signal();

    const spy_a = vi.fn(() => baz.dir);
    const spy_b = vi.fn(() => foo.get());

    effect(spy_a);
    effect(spy_b);

    const s = scope();

    s(() => {
      baz.dir = 1;
      foo.set(1);

      expect(spy_a).toBeCalledTimes(2);
      expect(spy_b).toBeCalledTimes(2);
    });

    stop(s);

    baz.dir = 2;
    foo.set(2);

    expect(spy_a).toBeCalledTimes(3);
    expect(spy_b).toBeCalledTimes(3);
  });

  test('should be possible to nest scopes', () => {
    let tmp_a = 0;
    let tmp_b = 0;

    const foo = proxy({ baz: 0 });

    const s_a = scope();
    const s_b = scope();

    s_a(() => {
      effect(() => (tmp_a = foo.baz));

      s_b(() => effect(() => (tmp_b = foo.baz)));
    });

    foo.baz = 1;

    expect(tmp_a).toBe(1);
    expect(tmp_b).toBe(1);

    stop(s_a);

    foo.baz = 55;

    expect(tmp_a).toBe(1);
    expect(tmp_b).toBe(55);
  });

  test('when scope is stopped it should stop comtuped signals', () => {
    const foo = signal(1);
    const baz = proxy({ dir: 4 });

    let tar;

    const s = scope();

    s(() => (tar = computed(() => foo.get() + baz.dir)));

    foo.set(12);
    expect(tar.get()).toBe(16);
    baz.dir = 3;
    expect(tar.get()).toBe(15);

    stop(s);

    foo.set(2);
    expect(tar.get()).toBe(15);
    baz.dir = 6;
    expect(tar.get()).toBe(15);
  });
});
