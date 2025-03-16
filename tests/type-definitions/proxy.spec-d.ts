import { proxy } from '@lib';

describe('proxy type test', () => {
  test('writable should return the same type', () => {
    const input: { a?: string; readonly b: number } = {
      a: '',
      b: 2,
    };

    expectTypeOf(proxy(input, false, false)).toEqualTypeOf<typeof input>();
    expectTypeOf(proxy(input, false, true)).toEqualTypeOf<typeof input>();

    expectTypeOf(proxy(2)).toBeNumber();
    expectTypeOf(proxy('')).toBeString();
    expectTypeOf(proxy(true)).toBeBoolean();
    expectTypeOf(proxy(false)).toBeBoolean();
  });

  describe('readonly should return readonly', () => {
    test('deep', () => {
      const input: {
        a?: string;
        readonly b: number;
        c: { d: string; e: { f: boolean } };
      } = { a: '', b: 2, c: { d: '', e: { f: true } } };

      expectTypeOf(proxy(input, true, false)).toEqualTypeOf<{
        readonly a?: string;
        readonly b: number;
        readonly c: {
          readonly d: string;
          readonly e: { readonly f: boolean };
        };
      }>();
    });

    test('shallow', () => {
      const input: {
        a?: string;
        readonly b: number;
        c: { d: string; e: { f: boolean } };
      } = { a: '', b: 2, c: { d: '', e: { f: true } } };

      expectTypeOf(proxy(input, true, true)).toEqualTypeOf<{
        readonly a?: string;
        readonly b: number;
        readonly c: {
          d: string;
          e: { f: boolean };
        };
      }>();
    });
  });
});
