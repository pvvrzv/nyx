import { proxy, signal, effect, untracked } from '@lib';

describe('`untracked` specification', () => {
  test('untracked should not add proxy as dependency', () => {
    const foo = proxy({ baz: 1 });
    const dir = signal(3);

    let tmp = 0;

    effect(() => untracked(() => (tmp = foo.baz + dir.get())));

    expect(tmp).toBe(4);
    foo.baz = 22;
    dir.set(1);
    expect(tmp).toBe(4);
    expect(foo.baz).toBe(22);
    expect(dir.get()).toBe(1);
  });
});
