export const type = (target: unknown) => {
  return Object.prototype.toString.call(target).slice(8, -1);
};

export const isNumeric = (() => {
  const regexp = /^\d+$/;

  return (key: string) => regexp.test(key);
})();

export const WellKnownSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    // ios10.x Object.getOwnPropertyNames(Symbol) can enumerate 'arguments' and
    // 'caller' but accessing them leads to TypeError
    // Webkit bug 181321
    .filter((key) => key !== 'arguments' && key !== 'caller')
    .map((key) => (Symbol as any)[key])
    .filter((value) => typeof value === 'symbol')
);

export enum ObservableType {
  INVALID,
  COMMON,
  COLLECTION,
}

export const cast = (target: unknown) => {
  switch (type(target)) {
    case 'Object':
    case 'Array':
      return ObservableType.COMMON;
    case 'Map':
    case 'WeakMap':
    case 'Set':
    case 'WeakSet':
      return ObservableType.COLLECTION;
    default:
      return ObservableType.INVALID;
  }
};

// raw -> shallow readonly
export const r2sr = new WeakMap<any, any>();
// raw -> shallow writable
export const r2sw = new WeakMap<any, any>();
// raw -> deep readonle
export const r2dr = new WeakMap<any, any>();
// raw -> deep writable
export const r2dw = new WeakMap<any, any>();

export const V_ITERATOR = Symbol();

export const V_KEY_ITERATOR = Symbol();

export enum OPCODES {
  ADD,
  SET,
  DELETE,
  CLEAR,
  GET,
  HAS,
  ITERATE,
}
