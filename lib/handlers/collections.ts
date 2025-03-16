import { type, OPCODES, V_ITERATOR, V_KEY_ITERATOR } from '../shared';
import { track, trigger } from '../proxy';
import { proxy, $$readonly, $$raw, $$shallow, raw } from '../proxy';
import { r2dw, r2sw, r2dr, r2sr } from '../shared';
import common from './common';

type SetTarget = Set<any> | WeakSet<any>;
type MapTarget = Map<any, any> | WeakMap<any, any>;
type CollectionTarget = MapTarget | SetTarget;
type StrongCollectionTarget = Map<any, any> | Set<any>;

function createIteratorPatch(name: string | symbol, readonly: boolean, shallow: boolean) {
  return function (this: StrongCollectionTarget, ...args: unknown[]) {
    const target = raw(this) as any;
    const iterator = target[name](...args);
    const tuple = name === 'entries' || (name === Symbol.iterator && type(target) === 'Map');

    track(target, name === 'keys' && type(target) === 'Map' ? V_KEY_ITERATOR : V_ITERATOR);

    return {
      next() {
        const { value, done } = iterator.next();

        if (done) return { value, done };

        return tuple
          ? {
              value: [
                shallow ? value[0] : proxy(value[0], readonly, shallow),
                shallow ? value[1] : proxy(value[1], readonly, shallow),
              ],
              done,
            }
          : { value: shallow ? value : proxy(value, readonly, shallow), done };
      },

      [Symbol.iterator]() {
        return this;
      },
    };
  };
}

const base = (readonly: boolean, shallow: boolean) => ({
  get(this: MapTarget, key: unknown) {
    const target = raw(this);
    const _key = raw(key);

    track(target, key);

    if (target.has(key)) {
      return shallow ? target.get(key) : proxy(target.get(key), readonly, shallow);
    } else if (target.has(_key)) {
      return shallow ? target.get(_key) : proxy(target.get(_key), readonly, shallow);
    }

    return undefined;
  },

  has(this: CollectionTarget, key: unknown) {
    const target = raw(this);
    const _key = raw(key);

    track(target, key);
    track(target, _key);

    if (target.has(key) || target.has(_key)) return true;

    return false;
  },

  forEach(this: StrongCollectionTarget, callback: Function, thisArg?: unknown) {
    const target = raw(this);

    track(target, V_ITERATOR);

    return target.forEach((value: unknown, key: unknown) => {
      return callback.call(
        thisArg,
        shallow ? value : proxy(value, readonly, shallow),
        shallow ? key : proxy(key, readonly, shallow),
        this
      );
    });
  },
});

const writable = (shallow: boolean) => ({
  ...base(false, shallow),

  get size() {
    const target = raw(this) as any;
    track(target, V_ITERATOR);
    return target.size;
  },

  add(this: SetTarget, value: unknown) {
    if (!shallow) {
      value = raw(value);
    }

    const target = raw(this);
    const idle = target.has(value);

    if (!idle) {
      target.add(value);
      trigger(target, OPCODES.ADD, value);
    }

    return this;
  },

  set(this: MapTarget, key: unknown, value: unknown) {
    value = shallow ? value : raw(value);

    const target = raw(this);

    const idle = target.has(key) || target.has((key = raw(key)));
    const same = raw(target.get(key)) === value;

    target.set(key, value);

    if (!same || !idle) {
      trigger(target, idle ? OPCODES.SET : OPCODES.ADD, key);
    }

    return this;
  },

  clear(this: StrongCollectionTarget) {
    const target = raw(this);
    const idle = target.size === 0;
    const outcome = target.clear();

    if (!idle) trigger(target, OPCODES.CLEAR, undefined);

    return outcome;
  },

  delete(this: CollectionTarget, key: unknown) {
    const target = raw(this);
    const deleted = target.delete(key) || target.delete((key = raw(key) || key));

    if (deleted) {
      trigger(target, OPCODES.DELETE, key);
    }

    return deleted;
  },

  keys: createIteratorPatch('keys', false, shallow),

  values: createIteratorPatch('values', false, shallow),

  entries: createIteratorPatch('entries', false, shallow),

  [Symbol.iterator]: createIteratorPatch(Symbol.iterator, false, shallow),
});

const readonly = (shallow: boolean) => ({
  ...base(true, shallow),

  get size() {
    const target = raw(this) as any;
    track(target, V_ITERATOR);
    return target.size;
  },

  add() {
    throw new Error('readonly');
  },

  set() {
    throw new Error('readonly');
  },

  clear() {
    throw new Error('readonly');
  },

  delete() {
    throw new Error('readonly');
  },

  keys: createIteratorPatch('keys', true, shallow),

  values: createIteratorPatch('values', true, shallow),

  entries: createIteratorPatch('entries', true, shallow),

  [Symbol.iterator]: createIteratorPatch(Symbol.iterator, true, shallow),
});

const collection = {
  writable: {
    shallow: writable(true),
    deep: writable(false),
  },
  readonly: {
    shallow: readonly(true),
    deep: readonly(false),
  },
};

const construct = (readonly: boolean, shallow: boolean) => {
  const mixin = readonly
    ? shallow
      ? common.readonly.shallow
      : common.readonly.deep
    : shallow
    ? common.writable.shallow
    : common.writable.deep;

  const c = readonly
    ? shallow
      ? collection.readonly.shallow
      : collection.readonly.deep
    : shallow
    ? collection.writable.shallow
    : collection.writable.deep;

  const store = readonly ? (shallow ? r2sr : r2dr) : shallow ? r2sw : r2dw;

  return {
    ...mixin,

    get(target: CollectionTarget, key: string | symbol, receiver: CollectionTarget) {
      if (key === $$raw) {
        return store.get(target) === receiver ? target : undefined;
      } else if (key === $$shallow) {
        return shallow;
      } else if (key === $$readonly) return readonly;

      return Reflect.get(Object.hasOwnProperty.call(c, key) ? c : target, key, receiver);
    },
  };
};

export default {
  writable: {
    shallow: construct(false, true),
    deep: construct(false, false),
  },

  readonly: {
    shallow: construct(true, true),
    deep: construct(true, false),
  },
};
