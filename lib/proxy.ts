import { $$signal } from './signal';
import common from './handlers/common';
import { type Effect, activeEffect, ignoreTrack } from './effect';
import collection from './handlers/collections';
import { scheduler } from './scheduler';
import {
  r2dw,
  r2sw,
  r2dr,
  r2sr,
  type,
  cast,
  V_ITERATOR,
  V_KEY_ITERATOR,
  OPCODES,
  ObservableType,
  isNumeric,
} from './shared';

export const $$preseve = Symbol();
export const $$readonly = Symbol();
export const $$shallow = Symbol();
export const $$raw = Symbol();

export const store: Map<object, Map<any, Set<Effect>>> = new Map();

const queue: Set<Set<Effect> | undefined> = new Set();

type DeepReadonly<T> = { readonly [x in keyof T]: DeepReadonly<T[x]> };

export function proxy<T extends any, R extends boolean = false, S extends boolean = false>(
  target: T,
  readonly?: R,
  shallow?: S
): R extends true ? (S extends true ? Readonly<T> : DeepReadonly<T>) : T {
  target = raw(target);

  if (!Object.isExtensible(target)) {
    return target;
  }

  const type = cast(target);

  if (type === ObservableType.INVALID || (target as any)[$$signal]) {
    return target;
  }

  if ((target as any)[$$preseve]) return target;

  const store = readonly ? (shallow ? r2sr : r2dr) : shallow ? r2sw : r2dw;

  if (store.has(target)) return store.get(target);

  const interceptors =
    type === ObservableType.COMMON
      ? readonly
        ? shallow
          ? common.readonly.shallow
          : common.readonly.deep
        : shallow
        ? common.writable.shallow
        : common.writable.deep
      : readonly
      ? shallow
        ? collection.readonly.shallow
        : collection.readonly.deep
      : shallow
      ? collection.writable.shallow
      : collection.writable.deep;

  const proxy = new Proxy(target as object, interceptors);

  store.set(target, proxy);

  return proxy as T;
}

proxy.is = (target: unknown) => {
  return typeof target === 'object' && target !== null && !!(target as any)[$$raw];
};

export function track(target: any, key?: unknown) {
  if (ignoreTrack) return;

  if (!activeEffect || activeEffect.discarded) return;

  let map = store.get(target);

  if (!map) {
    store.set(target, (map = new Map()));
  }

  let effects = map.get(key);

  if (!effects) {
    map.set(key, (effects = new Set()));
  }

  effects.add(activeEffect);
  activeEffect.dependencies.add(effects);
}

export function trigger(target: any, opcode: OPCODES, key: unknown) {
  const map = store.get(target);

  if (!map) return;

  if (Array.isArray(target)) {
    if (key === 'length') {
      for (const [key, effects] of map) {
        if (typeof key !== 'symbol' && key >= target.length) {
          queue.add(effects);
        }
      }

      queue.add(map.get('length'));
    } else if (opcode === OPCODES.ADD && typeof key === 'string' && isNumeric(key)) {
      queue.add(map.get('length'));
    }
  }

  queue.add(map.get(key));

  switch (opcode) {
    case OPCODES.ADD:
    case OPCODES.DELETE:
      queue.add(map.get(V_ITERATOR));
      queue.add(map.get(V_KEY_ITERATOR));
      break;
    case OPCODES.SET:
      const _type = type(target);
      if (_type === 'Map' || _type === 'Array') queue.add(map.get(V_ITERATOR));
      break;
    case OPCODES.CLEAR:
      for (const set of map.values()) {
        for (const effect of set) {
          effect.clean = false;
          scheduler.add(effect);
        }
      }
  }

  for (const set of queue) {
    if (set === undefined) continue;

    for (const effect of set) {
      effect.clean = false;
      scheduler.add(effect);
    }
  }

  queue.clear();

  !scheduler.paused && scheduler.flush();
}

export function preserve<T extends any>(target: T): T {
  if (Object.isExtensible(target)) {
    Object.defineProperty(target, $$preseve, {
      enumerable: false,
      value: true,
    });
  }
  return target;
}

export function raw<T>(target: T): T {
  return typeof target === 'object' && target !== null ? (target as any)[$$raw] || target : target;
}
