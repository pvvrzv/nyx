import { preserve, proxy } from '@lib';

describe('`preserve` specification', () => {
  test('should return target', () => {
    const target = {};

    expect(preserve(target)).toBe(target);
  });

  test('should not proxy a preserved target', () => {
    const target = preserve({});
    const foo = proxy(target);

    expect(target).toBe(foo);
  });

  test('should not proxy nested preserved target', () => {
    const target = preserve({});
    const foo = proxy({ target });

    expect(foo.target).toBe(target);
  });
});
