import { proxy, signal, group, effect } from '@lib';

describe('`group` specification', () => {
  test('should group effects', () => {
    const foo = proxy({ baz: 5 });
    const dir = signal(2);

    const spy_a = vi.fn(() => foo.baz);
    const spy_b = vi.fn(() => dir.get());

    effect(spy_a);
    effect(spy_b);

    expect(spy_a).toBeCalledTimes(1);
    expect(spy_b).toBeCalledTimes(1);

    foo.baz = 12;
    dir.set(5);

    expect(spy_a).toBeCalledTimes(2);
    expect(spy_b).toBeCalledTimes(2);

    group(() => {
      foo.baz = 2;
      expect(spy_a).toBeCalledTimes(2);
      dir.set(3);
      expect(spy_b).toBeCalledTimes(2);
    });

    expect(spy_a).toBeCalledTimes(3);
    expect(spy_b).toBeCalledTimes(3);
  });

  test('should group effects on initialization', () => {
    const foo = signal(1);
    const baz = proxy({ dif: 1 });
    const spy_a = vi.fn(() => foo.get());
    const spy_b = vi.fn(() => baz.dir);

    group(() => {
      effect(spy_a);
      effect(spy_b);

      expect(spy_a).toBeCalledTimes(0);
      expect(spy_a).toBeCalledTimes(0);
    });

    expect(spy_a).toBeCalledTimes(1);
    expect(spy_a).toBeCalledTimes(1);
  });

  test('should recover from an error inside a group', () => {
    expect(() => {
      group(() => {
        throw new Error();
      });
    }).to.throw();

    const spy = vi.fn(() => {});
    effect(spy);
    expect(spy).toBeCalledTimes(1);
  });

  test('should allow for nested grouping', () => {
    const spy_a = vi.fn(() => {});
    const spy_b = vi.fn(() => {});

    group(() => {
      effect(spy_a);
      expect(spy_a).toBeCalledTimes(0);

      group(() => {
        effect(spy_b);
        expect(spy_b).toBeCalledTimes(0);
      });

      expect(spy_b).toBeCalledTimes(1);
    });

    const foo = signal();
    const baz = proxy({ dir: 1 });

    const spy_c = vi.fn(() => foo.get());
    const spy_d = vi.fn(() => baz.dir);

    effect(spy_c);
    effect(spy_d);

    expect(spy_c).toBeCalledTimes(1);
    expect(spy_d).toBeCalledTimes(1);

    foo.set(1);
    baz.dir = 2;

    expect(spy_c).toBeCalledTimes(2);
    expect(spy_d).toBeCalledTimes(2);
  });

  test('array mothods that use group internally should propagate', () => {
    const foo = proxy([]);

    const spy_a = vi.fn(() => foo.length);

    effect(spy_a);

    expect(spy_a).toBeCalledTimes(1);

    group(() => {
      foo.push(1);
      expect(spy_a).toBeCalledTimes(1);
      foo.pop();
      expect(spy_a).toBeCalledTimes(1);
      foo.unshift(1);
      expect(spy_a).toBeCalledTimes(1);
      foo.shift();
      expect(spy_a).toBeCalledTimes(1);
    });
  });
});
