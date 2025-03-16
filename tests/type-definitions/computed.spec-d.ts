import { type Signal, computed } from '@lib';

test('computed hook type test', () => {
  expectTypeOf(computed).toBeCallableWith(() => {});

  const c = computed(() => 2);

  expectTypeOf(c.get()).toBeNumber();
  expectTypeOf(c).toEqualTypeOf<Signal<number>>();
});
