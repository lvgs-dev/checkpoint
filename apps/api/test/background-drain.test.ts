import { describe, it, expect } from 'vitest';
import { runInBackground, pendingCount, drainPending } from '../src/routes/background.ts';

describe('background promise tracking', () => {
  it('tracks a promise while pending and removes it after resolving', async () => {
    let resolveTask!: () => void;
    const task = new Promise<void>((resolve) => {
      resolveTask = resolve;
    });

    const before = pendingCount();
    runInBackground(task);
    expect(pendingCount()).toBe(before + 1);

    resolveTask();
    await drainPending(500);

    expect(pendingCount()).toBe(before);
  });

  it('catches rejection without throwing and removes the promise', async () => {
    let rejectTask!: (err: unknown) => void;
    const task = new Promise<void>((_, reject) => {
      rejectTask = reject;
    });

    const before = pendingCount();
    runInBackground(task);
    expect(pendingCount()).toBe(before + 1);

    rejectTask(new Error('background test failure'));
    await drainPending(500);

    expect(pendingCount()).toBe(before);
  });

  it('drainPending resolves after the tracked promise resolves', async () => {
    let resolved = false;
    const task = new Promise<void>((resolve) => {
      setTimeout(() => {
        resolved = true;
        resolve();
      }, 10);
    });

    runInBackground(task);
    await drainPending(1000);

    expect(resolved).toBe(true);
    expect(pendingCount()).toBe(0);
  });

  it('drainPending resolves after timeout when the promise never resolves', async () => {
    const neverEnding = new Promise<void>(() => {});

    runInBackground(neverEnding);
    const start = Date.now();
    await drainPending(20);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(15);
    expect(pendingCount()).toBeGreaterThan(0);
  });
});
