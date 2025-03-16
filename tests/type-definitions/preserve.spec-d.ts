import { preserve } from '@lib';

test('preserve hook type test', () => {
  expectTypeOf(preserve({ a: '', b: 2 })).toEqualTypeOf<{
    a: string;
    b: number;
  }>();

  expectTypeOf(preserve(2)).toBeNumber();

  expectTypeOf(preserve).toBeCallableWith(2);
  expectTypeOf(preserve).toBeCallableWith(2);
});
