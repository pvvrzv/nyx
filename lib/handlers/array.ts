import { untracked } from '../effect';
import { group } from '../scheduler';
import { proxy, raw } from '@lib/proxy';

const base = (readonly: boolean, shallow: boolean) => {
  const methods: any = {};

  ['indexOf', 'lastIndexOf', 'includes'].forEach((name) => {
    methods[name] = function (this: unknown[], ...args: unknown[]) {
      const target = raw(this) as any;
      const result = Reflect.apply(target[name], this, args) as number | boolean;

      if (result === true || (result !== false && result !== -1)) return result;

      return Reflect.apply(
        target[name],
        this,
        args.map((a) => proxy(a, readonly, shallow))
      );
    };
  });

  return methods;
};

const writable = (shallow: boolean) => ({
  ...base(false, shallow),

  push(this: unknown[], ...args: unknown[]) {
    return group(() => untracked(() => raw(this)!.push.apply(this, args)), true);
  },

  pop(this: unknown[]) {
    return group(() => untracked(() => raw(this)!.pop.apply(this)), true);
  },

  unshift(this: unknown[], ...args: unknown[]) {
    return group(() => untracked(() => raw(this)!.unshift.apply(this, args)), true);
  },

  shift(this: unknown[]) {
    return group(() => untracked(() => raw(this)!.shift.apply(this)), true);
  },
});

const readonly = (shallow: boolean) => ({
  ...base(true, shallow),

  push(this: unknown[]) {
    throw new Error('readonly');
  },

  pop(this: unknown[]) {
    throw new Error('readonly');
  },

  unshift(this: unknown[]) {
    throw new Error('readonly');
  },

  shift(this: unknown[]) {
    throw new Error('readonly');
  },
});

export default {
  writable: {
    shallow: writable(true),
    deep: writable(false),
  },
  readonly: {
    shallow: readonly(true),
    deep: readonly(false),
  },
};
