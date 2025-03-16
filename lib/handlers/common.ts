import { isNumeric } from '../shared';
import { OPCODES, V_ITERATOR, WellKnownSymbols } from '../shared';
import { $$raw, $$readonly, $$shallow, proxy, raw } from '../proxy';
import { r2dw, r2sw, r2dr, r2sr } from '../shared';
import { track, trigger } from '../proxy';
import arrayPatches from './array';

const base = (
  readonly: boolean,
  shallow: boolean,
  patches: (typeof arrayPatches)['writable' | 'readonly']['shallow' | 'deep'],
  store: typeof r2dw | typeof r2sw | typeof r2dr | typeof r2sw
) => ({
  get(target: object, key: string | symbol, receiver: object) {
    const value = Reflect.get(target, key, receiver);

    if (typeof key === 'symbol') {
      if (key === $$raw) {
        return store.get(target) === receiver ? target : undefined;
      } else if (key === $$shallow) {
        return shallow;
      } else if (key === $$readonly) return readonly;
      else if (WellKnownSymbols.has(key)) return value;
    }

    if (Array.isArray(target) && Object.hasOwnProperty.call(patches, key)) {
      return Reflect.get(patches, key, receiver);
    }

    if (!readonly) track(target, key);

    return shallow ? value : proxy(value, readonly, shallow);
  },

  has(target: object, key: string | symbol) {
    if (!readonly || typeof key !== 'symbol' || !WellKnownSymbols.has(key)) {
      track(target, key);
    }

    return Reflect.has(target, key);
  },

  ownKeys(target: object) {
    if (!readonly) track(target, V_ITERATOR);
    return Reflect.ownKeys(target);
  },
});

const writable = (shallow: boolean) => ({
  ...base(false, shallow, shallow ? arrayPatches.writable.shallow : arrayPatches.writable.deep, shallow ? r2sw : r2dw),

  set(target: object, key: string | symbol, value: unknown, receiver: object): boolean {
    value = shallow ? value : raw(value);

    if (raw((target as any)[key]) === value) return true;

    const idle =
      Array.isArray(target) && typeof key === 'string' && isNumeric(key)
        ? parseInt(key) < target.length
        : Object.prototype.hasOwnProperty.call(target, key);

    const result = Reflect.set(target, key, value, receiver);

    if (target !== raw(receiver)) return result;

    trigger(target, idle ? OPCODES.SET : OPCODES.ADD, key);

    return result;
  },

  deleteProperty(target: object, key: string | symbol) {
    const had = Object.prototype.hasOwnProperty.call(target, key);
    const outcome = Reflect.deleteProperty(target, key);

    if (had) {
      trigger(target, OPCODES.DELETE, key);
    }

    return outcome;
  },
});

const readonly = (shallow: boolean) => ({
  ...base(true, shallow, shallow ? arrayPatches.readonly.shallow : arrayPatches.readonly.deep, shallow ? r2sr : r2dr),

  set(): boolean {
    throw new Error('readonly');
  },

  deleteProperty() {
    throw new Error('readonly');
  },
});

export default {
  readonly: {
    shallow: readonly(true),
    deep: readonly(false),
  },
  writable: {
    shallow: writable(true),
    deep: writable(false),
  },
};
