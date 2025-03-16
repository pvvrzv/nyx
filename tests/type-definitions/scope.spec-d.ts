import { scope } from '@lib';

test('scope hook type test', () => {
  const s = scope();

  expectTypeOf(s).toMatchTypeOf<Function>();
});
