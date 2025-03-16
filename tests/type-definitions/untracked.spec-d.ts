import { untracked } from '@lib';

test('silent hook type test', () => {
  expectTypeOf(untracked).toBeCallableWith(() => {});
});
