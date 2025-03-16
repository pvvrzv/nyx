import { readonly } from '@lib';

test('readonly hook type test', () => {
  expectTypeOf(
    readonly({ a: '', b: 2, c: { d: false, e: { f: {} } } })
  ).toEqualTypeOf<{
    readonly a: string;
    readonly b: number;
    readonly c: {
      readonly d: boolean;
      readonly e: { readonly f: {} };
    };
  }>();

  expectTypeOf(readonly(2)).toBeNumber();
  expectTypeOf(readonly('')).toBeString();
  expectTypeOf(readonly(false)).toBeBoolean();
  expectTypeOf(readonly(true)).toBeBoolean();
});
