type Queue = Array<(...args: any[]) => void>;

class Scheduler {
  public queue: Queue = [];

  public paused: boolean = false;
  public base: number = 0;

  public add(callback: (...args: any[]) => void) {
    this.queue.push(callback);
  }

  flush(from: number = this.base) {
    try {
      for (let i = from; i < this.queue.length; i++) {
        this.queue[i]!();
      }
    } finally {
      this.queue.length = from;
    }
  }
}

export const scheduler = new Scheduler();

export function group<T extends (...args: any[]) => any>(callback: T, falltrought?: boolean): ReturnType<T> {
  if (falltrought && scheduler.paused) return callback();

  const length = scheduler.queue.length;
  const base = scheduler.base;
  const paused = scheduler.paused;

  let result;

  try {
    scheduler.base = length;
    scheduler.paused = true;
    result = callback();
  } finally {
    scheduler.flush(length);
    scheduler.paused = paused;
    scheduler.base = base;
  }

  return result;
}

export function sync<T extends (...args: any[]) => any>(callback: T): ReturnType<T> {
  if (!scheduler.paused) return callback();

  const length = scheduler.queue.length;
  const base = scheduler.base;
  const paused = scheduler.paused;

  let result;

  try {
    scheduler.base = length;
    scheduler.paused = false;
    result = callback();
  } finally {
    scheduler.flush(length);
    scheduler.paused = paused;
    scheduler.base = base;
  }

  return result;
}
