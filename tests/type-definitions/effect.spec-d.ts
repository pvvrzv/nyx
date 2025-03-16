import { effect } from '@lib';

test('effect hook type test', () => {
  expectTypeOf(effect).toBeCallableWith(() => {});
  expectTypeOf(effect).toBeCallableWith(() => () => {});
  expectTypeOf(effect).toBeCallableWith(() => 2);
  expectTypeOf(effect).toBeCallableWith(() => '');
  expectTypeOf(effect).toBeCallableWith(() => new Map());
  expectTypeOf(effect).toBeCallableWith(() => Symbol());
  expectTypeOf(effect).toBeCallableWith(() => 1n);
  expectTypeOf(effect(() => {})).toMatchTypeOf<Function>();
});
