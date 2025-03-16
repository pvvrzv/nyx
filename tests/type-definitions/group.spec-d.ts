import { group } from '@lib';

test('group hook type test', () => {
  expectTypeOf(group).toBeCallableWith(() => {});
});
