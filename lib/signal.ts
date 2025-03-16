import { type Effect, effect, activeEffect, ignoreTrack } from './effect';
import { scheduler } from './scheduler';

export const $$signal = Symbol();

function track(dependencies: Set<Effect>) {
  if (ignoreTrack) return;

  if (!activeEffect || activeEffect.discarded) return;

  dependencies.add(activeEffect);
  activeEffect.dependencies.add(dependencies);
}

function trigger(dependencies: Set<Effect>) {
  for (const effect of dependencies) {
    effect.clean = false;
    scheduler.add(effect);
  }

  !scheduler.paused && scheduler.flush();
}

export class Signal<T = undefined> {
  public [$$signal] = true;
  private effects: Set<Effect> = new Set();

  constructor(public value: T) {}

  get() {
    track(this.effects);
    return this.value;
  }

  set(value: T) {
    if (value === this.value) return value;

    this.value = value;
    trigger(this.effects);

    return this.value;
  }

  update(callback: (value: T) => T) {
    if (typeof callback !== 'function') {
      throw new Error('Unable to update with non-callable callback');
    }

    const v = callback(this.value);

    if ((v !== null && typeof v === 'object') || v !== this.value) {
      this.value = v;
      trigger(this.effects);
    }

    return this.value;
  }
}

export function signal<V>(): Signal<V | undefined>;
export function signal<V = undefined>(value: V): Signal<V>;
export function signal<V>(value?: V): Signal<V> {
  return isSignal<V>(value) ? value : new Signal<V>(value as V);
}

export function computed<V>(getter: () => V): Signal<V> {
  const s = signal<V>(undefined as V);

  effect(() => s.set(getter()));

  return s;
}

function isSignal<T>(target: Signal<T> | unknown): target is Signal<T> {
  return typeof target === 'object' && target !== null && (target as any)[$$signal];
}

signal.is = isSignal;
