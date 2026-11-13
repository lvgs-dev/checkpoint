// Contexto por requisição (AsyncLocalStorage): qualquer função chamada durante a
// requisição — serviço, repositório — lê o usuário com getContext(), sem precisar
// receber userId/token como parâmetro em toda a cadeia.
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { Role } from '../../../../packages/core/src/authorization.ts';

export interface RequestContext {
  requestId: string;
  /** Local authentication identity. Absent on public routes. */
  userId?: string;
  /** Product role read from the identity record. */
  role?: Role;
  emailVerified?: boolean;
  /** E-mail do token (usado só para vincular o app_user do seed no primeiro login). */
  email?: string;
  /** app_user.id resolvido (cache por requisição; scripts/testes podem defini-lo direto). */
  appUserId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: Partial<RequestContext>, fn: () => T): T {
  return storage.run({ requestId: randomUUID(), ...ctx }, fn);
}

/** Contexto da requisição atual, ou undefined fora de uma requisição. */
export function getContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Completa o contexto atual (ex.: após autenticar). Ignorado fora de uma requisição. */
export function setContext(patch: Partial<RequestContext>): void {
  const ctx = storage.getStore();
  if (ctx) Object.assign(ctx, patch);
}
