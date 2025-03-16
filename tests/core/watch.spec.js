import { watch, proxy, signal, stop } from '@lib';

describe('`watch` specification', () => {
  test('should not be called when initialized', () => {
    const foo = proxy({});
    const baz = signal();

    const spy_a = vi.fn(() => {});
    const spy_b = vi.fn(() => {});

    watch(() => foo.dir, spy_a);
    watch(() => baz.get(), spy_b);

    expect(spy_a).not.toHaveBeenCalled();
    expect(spy_b).not.toHaveBeenCalled();
  });

  test('should be triggered when mutation happens', () => {
    const foo = proxy({});
    const baz = signal();

    const spy_a = vi.fn(() => {});
    const spy_b = vi.fn(() => {});

    watch(() => foo.dir, spy_a);
    watch(() => baz.get(), spy_b);

    foo.dir = 1;
    expect(spy_a).toBeCalledTimes(1);
    baz.set(1);
    expect(spy_b).toBeCalledTimes(1);
  });

  test('should not register dependencies used in a callback', () => {
    const foo = proxy({});
    const baz = signal();

    const spy = vi.fn(() => baz.get());

    watch(() => foo.dir, spy);

    foo.dir = 1;
    expect(spy).toBeCalledTimes(1);
    baz.set(1);
    expect(spy).toBeCalledTimes(1);
  });

  test('should call getter only once', () => {
    const foo = proxy({});
    const baz = signal();

    const getter_a = vi.fn(() => foo.dir);
    const getter_b = vi.fn(() => baz.get());

    const spy_a = vi.fn(() => {});
    const spy_b = vi.fn(() => {});

    watch(getter_a, spy_a);
    watch(getter_b, spy_b);

    expect(getter_a).toBeCalledTimes(1);
    expect(getter_b).toBeCalledTimes(1);

    foo.dir = 1;
    baz.set(1);

    expect(spy_a).toBeCalledTimes(1);
    expect(spy_b).toBeCalledTimes(1);
    expect(getter_a).toBeCalledTimes(1);
    expect(getter_b).toBeCalledTimes(1);
  });

  test('should be possible to stop', () => {
    const foo = signal();

    const spy = vi.fn(() => {});

    const e = watch(() => foo.get(), spy);

    stop(e);

    foo.set(1);

    expect(spy).not.toHaveBeenCalled();
  });

  test('should be possible to stop when active', () => {
    const foo = signal();

    const effects = [];

    const spy = vi.fn(() => {
      for (const effect of effects) {
        stop(effect);
      }
    });

    const e = watch(() => foo.get(), spy);

    effects.push(e);

    foo.set(1);
    expect(spy).toHaveBeenCalledTimes(1);
    foo.set(2);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('must not allow implicit direct recursion', () => {
    const foo = proxy({ baz: 5 });
    const spy = vi.fn(() => foo.baz++);

    watch(() => foo.baz, spy);

    expect(foo.baz).toBe(5);
    expect(spy).toBeCalledTimes(0);
    foo.baz = 3;
    expect(foo.baz).toBe(4);
    expect(spy).toBeCalledTimes(1);
  });

  test('must not allow implicit indirect recursion', () => {
    const foo = proxy({ baz: 0, raf: 2 });
    const spy_a = vi.fn(() => (foo.baz = foo.raf));
    const spy_b = vi.fn(() => (foo.raf = foo.baz));

    watch(() => (foo.baz, foo.raf), spy_a);
    watch(() => (foo.baz, foo.raf), spy_b);

    expect(foo.baz).toBe(0);
    expect(foo.raf).toBe(2);
    expect(spy_a).toBeCalledTimes(0);
    expect(spy_b).toBeCalledTimes(0);
    foo.baz = 4;
    expect(foo.baz).toBe(2);
    expect(foo.raf).toBe(2);
    expect(spy_a).toBeCalledTimes(1);
    expect(spy_b).toBeCalledTimes(1);
    foo.raf = 3;
    expect(foo.baz).toBe(3);
    expect(foo.raf).toBe(3);
    expect(spy_a).toBeCalledTimes(2);
    expect(spy_b).toBeCalledTimes(2);
  });

  describe('cleanup', () => {
    test('should run cleanup callback if it was passed', () => {
      const foo = signal(0);

      let shouldCleanup = true;

      const cleanup = vi.fn(() => {});

      watch(
        () => foo.get(),
        () => {
          return shouldCleanup ? cleanup : undefined;
        }
      );

      expect(cleanup).not.toBeCalled();
      foo.set(1);
      expect(cleanup).toBeCalledTimes(0);
      foo.set(2);
      expect(cleanup).toBeCalledTimes(1);
      shouldCleanup = false;
      foo.set(3);
      expect(cleanup).toBeCalledTimes(2);
      foo.set(4);
      expect(cleanup).toBeCalledTimes(2);
    });
  });

  test('should not track reactive values if getter threw an error', () => {
    const foo = signal(0);

    const spy = vi.fn(() => {});

    expect(() =>
      watch(() => {
        throw new Error();
      }, spy)
    ).toThrow();

    expect(spy).not.toBeCalled();
    foo.get();
    foo.set(1);
    expect(spy).not.toBeCalled();
  });
});
