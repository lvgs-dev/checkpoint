// Trabalho que continua depois da resposta HTTP.
// Mantém as promises em execução rastreadas na memória do processo Node.
import { logger } from '../observability/logger.ts';

const pending = new Set<Promise<unknown>>();

/** `task` não deve rejeitar (trate e registre os erros antes). */
export function runInBackground(task: Promise<unknown>): void {
  const tracked = task
    .catch((e) => {
      logger.error('background.failed', { error: e });
    })
    .finally(() => {
      pending.delete(tracked);
    });

  pending.add(tracked);
}

export function pendingCount(): number {
  return pending.size;
}

export function drainPending(timeoutMs: number): Promise<void> {
  if (pending.size === 0) {
    return Promise.resolve();
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });

  const allPendingPromise = Promise.all(Array.from(pending)).then(() => {});

  return Promise.race([allPendingPromise, timeoutPromise]).finally(() => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  });
}
