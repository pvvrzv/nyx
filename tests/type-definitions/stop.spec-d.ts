import { stop, scope, effect } from '@lib';

test('stop hook type test', () => {
  expectTypeOf(stop).toBeCallableWith(scope());
  expectTypeOf(stop).toBeCallableWith(effect(() => {}));
});
