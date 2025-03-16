import { scheduler } from './scheduler';

export let activeEffect: Effect | undefined;
export let activeScope: Scope | undefined;

export let ignoreTrack = false;

const $$effect = Symbol();
const $$scope = Symbol();

export type Effect = {
  [$$effect]: true;
  [$$scope]?: never;
  (): void;
  active: boolean;
  discarded: boolean;
  clean: boolean;
  dependencies: Set<Set<Effect>>;
  cleanup: undefined | (() => void);
};

type Scope = {
  [$$scope]: true;
  [$$effect]?: never;
  effects: Set<Effect>;
  (callback: Function): void;
};

export function scope(): Scope {
  const s: Scope = (callback: Function) => {
    const _s = activeScope;

    try {
      activeScope = s;
      callback();
    } finally {
      activeScope = _s;
    }
  };

  s.effects = new Set();
  s[$$scope] = true;

  return s;
}

export function effect(callback: () => any): Effect {
  if (typeof callback !== 'function') {
    throw new Error('wrong effect argument');
  }

  const e: Effect = () => {
    if (e.active || e.discarded || e.clean) return;

    const cleanup = e.cleanup;

    if (cleanup && typeof cleanup === 'function') {
      e.cleanup = undefined;
      cleanup();
    }

    e.clean = true;

    for (const set of e.dependencies) {
      set.delete(e);
    }

    e.dependencies.clear();

    const _ignoreTrack = ignoreTrack;
    const _e = activeEffect;

    try {
      ignoreTrack = false;
      e.active = true;
      activeEffect = e;
      e.cleanup = callback();
    } finally {
      activeEffect = _e;
      e.active = false;
      ignoreTrack = _ignoreTrack;
    }
  };

  e.clean = false;
  e.active = false;
  e[$$effect] = true;
  e.discarded = false;
  e.dependencies = new Set();
  e.cleanup = undefined;

  activeScope?.effects.add(e);

  if (scheduler.paused) scheduler.add(e);
  else e();

  return e;
}

export function watch(getter: (...args: any[]) => any, callback: (...args: any[]) => any): Effect {
  if (typeof callback !== 'function') {
    throw new Error('wrong effect argument');
  } else if (typeof getter !== 'function') {
    throw new Error('getter must be a function');
  }

  const e: Effect = () => {
    if (e.active || e.discarded || e.clean) return;

    const cleanup = e.cleanup;

    if (cleanup && typeof cleanup === 'function') {
      e.cleanup = undefined;
      cleanup();
    }

    e.clean = true;

    try {
      e.active = true;
      e.cleanup = callback();
    } finally {
      e.active = false;
    }
  };

  e.clean = false;
  e.active = false;
  e[$$effect] = true;
  e.discarded = false;
  e.dependencies = new Set();
  e.cleanup = undefined;

  activeScope?.effects.add(e);

  const _e = activeEffect;

  try {
    activeEffect = e;
    getter();
  } finally {
    activeEffect = _e;
  }

  return e;
}

export function stop(target: Effect | Scope) {
  if (typeof target !== 'function') return;

  if (target[$$scope]) {
    for (const effect of target.effects) {
      discard(effect);
    }
  } else if (target[$$effect]) {
    discard(target);
  }
}

function discard(effect: Effect) {
  for (const dependency of effect.dependencies) {
    dependency.delete(effect);
  }

  effect.dependencies.clear();
  effect.discarded = true;

  const cleanup = effect.cleanup;

  if (cleanup && typeof cleanup === 'function') {
    effect.cleanup = undefined;
    cleanup();
  }
}

export function untracked<T extends () => any>(callback: T): ReturnType<T> {
  const _ignoreTrack = ignoreTrack;

  ignoreTrack = true;
  const result = callback();
  ignoreTrack = _ignoreTrack;

  return result;
}
