import { proxy, signal, group, sync, effect } from '@lib';

describe('`sync` specification', () => {
  test('should run synchronously within a group stage', () => {
    const foo_a = signal(0);
    const baz_a = proxy({ dir: 0 });

    const foo_b = signal(0);
    const baz_b = proxy({ dir: 0 });

    const spy_a = vi.fn(() => (foo_a.get(), baz_a.dir));
    const spy_b = vi.fn(() => (foo_b.get(), baz_b.dir));

    group(() => {
      effect(spy_a);
      expect(spy_a).toBeCalledTimes(0);

      foo_a.set(1);
      expect(spy_a).toBeCalledTimes(0);
      baz_a.dir = 1;
      expect(spy_a).toBeCalledTimes(0);

      sync(() => {
        effect(spy_b);
        expect(spy_b).toBeCalledTimes(1);

        foo_b.set(1);
        expect(spy_b).toBeCalledTimes(2);
        baz_b.dir = 1;
        expect(spy_b).toBeCalledTimes(3);
      });

      expect(spy_a).toBeCalledTimes(0);
    });

    expect(spy_a).toBeCalledTimes(1);
  });

  test('should be possible to group within a sync stage', () => {
    const foo_a = signal(0);
    const baz_a = proxy({ dir: 0 });
    const foo_b = signal(0);
    const baz_b = proxy({ dir: 0 });
    const foo_c = signal(0);
    const baz_c = proxy({ dir: 0 });
    const foo_d = signal(0);
    const baz_d = proxy({ dir: 0 });
    const foo_e = signal(0);
    const baz_e = proxy({ dir: 0 });

    const spy_a = vi.fn(() => (foo_a.get(), baz_a.dir));
    const spy_b = vi.fn(() => (foo_b.get(), baz_b.dir));
    const spy_c = vi.fn(() => (foo_c.get(), baz_c.dir));
    const spy_d = vi.fn(() => (foo_d.get(), baz_d.dir));
    const spy_e = vi.fn(() => (foo_e.get(), baz_e.dir));

    group(() => {
      effect(spy_a);
      expect(spy_a).toBeCalledTimes(0);

      foo_a.set(1);
      expect(spy_a).toBeCalledTimes(0);
      baz_a.dir = 1;
      expect(spy_a).toBeCalledTimes(0);

      sync(() => {
        effect(spy_b);
        expect(spy_b).toBeCalledTimes(1);

        foo_b.set(1);
        expect(spy_b).toBeCalledTimes(2);
        baz_b.dir = 1;
        expect(spy_b).toBeCalledTimes(3);

        group(() => {
          effect(spy_c);
          expect(spy_c).toBeCalledTimes(0);

          foo_c.set(1);
          expect(spy_c).toBeCalledTimes(0);
          baz_c.dir = 1;
          expect(spy_c).toBeCalledTimes(0);

          sync(() => {
            effect(spy_d);
            expect(spy_d).toBeCalledTimes(1);

            foo_d.set(1);
            expect(spy_d).toBeCalledTimes(2);
            baz_d.dir = 1;
            expect(spy_d).toBeCalledTimes(3);

            group(() => {
              effect(spy_e);
              expect(spy_e).toBeCalledTimes(0);

              foo_e.set(1);
              expect(spy_e).toBeCalledTimes(0);
              baz_e.dir = 1;
              expect(spy_e).toBeCalledTimes(0);
            });

            expect(spy_e).toBeCalledTimes(1);

            foo_d.set(3);
            expect(spy_d).toBeCalledTimes(4);
            baz_d.dir = 3;
            expect(spy_d).toBeCalledTimes(5);
          });

          expect(spy_c).toBeCalledTimes(0);

          foo_c.set(3);
          expect(spy_c).toBeCalledTimes(0);
          baz_c.dir = 3;
          expect(spy_c).toBeCalledTimes(0);
        });

        expect(spy_c).toBeCalledTimes(1);

        foo_b.set(3);
        expect(spy_b).toBeCalledTimes(4);
        baz_b.dir = 3;
        expect(spy_b).toBeCalledTimes(5);
      });

      expect(spy_a).toBeCalledTimes(0);

      foo_a.set(2);
      expect(spy_a).toBeCalledTimes(0);
      baz_a.dir = 2;
      expect(spy_a).toBeCalledTimes(0);
    });

    expect(spy_a).toBeCalledTimes(1);

    foo_a.set(3);
    expect(spy_a).toBeCalledTimes(2);
    baz_a.dir = 3;
    expect(spy_a).toBeCalledTimes(3);
  });

  test('should not trigger an effect of a group is it was triggered in a nested synchronous stage', () => {
    const foo = signal(0);
    const baz = proxy({ dir: 0 });

    const spy_a = vi.fn(() => foo.get());
    const spy_b = vi.fn(() => baz.dir);

    effect(spy_a);
    effect(spy_b);

    expect(spy_a).toBeCalledTimes(1);
    expect(spy_b).toBeCalledTimes(1);

    group(() => {
      foo.set(1);
      baz.dir = 1;

      expect(spy_a).toBeCalledTimes(1);
      expect(spy_b).toBeCalledTimes(1);

      sync(() => {
        foo.set(2);
        baz.dir = 2;

        expect(spy_a).toBeCalledTimes(2);
        expect(spy_b).toBeCalledTimes(2);
      });

      expect(spy_a).toBeCalledTimes(2);
      expect(spy_b).toBeCalledTimes(2);
    });

    expect(spy_a).toBeCalledTimes(2);
    expect(spy_b).toBeCalledTimes(2);
  });
});
