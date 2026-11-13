// Resolve application ownership through the explicit identity mapping.
// Migration and provisioning link existing owners. Email never grants ownership.
import type { AppUserResolver } from '../data/ports.ts';
import { getContext, setContext } from '../shared/context.ts';
import { AppError } from '../shared/errors.ts';
import type { AppUserDriver } from '../data/drivers/types.ts';

export const SEED_APP_USER_ID = '00000000-0000-4000-8000-000000000001';

interface AppUserOptions {
  /** Usado quando não há usuário autenticado (somente dev com auth desligada). */
  devAppUserId?: string;
}

export function createAppUserResolver(
  driver: AppUserDriver,
  options: AppUserOptions = {},
): AppUserResolver {
  const cache = new Map<string, Promise<string>>();

  async function lookup(authId: string, email: string | null): Promise<string> {
    const found = await driver.findByAuthId(authId);
    if (found) return found;
    const created = await driver.create(authId, email);
    if (!created) throw new AppError('Usuário sem acesso', 403);
    return created;
  }

  return async () => {
    const ctx = getContext();
    if (ctx?.appUserId) return ctx.appUserId;
    const authId = ctx?.userId;
    if (!authId) {
      if (options.devAppUserId) return options.devAppUserId;
      throw new AppError('Autenticação necessária', 401);
    }
    let pending = cache.get(authId);
    if (!pending) {
      pending = lookup(authId, ctx.email?.trim() || null);
      cache.set(authId, pending);
      pending.catch(() => cache.delete(authId));
    }
    const id = await pending;
    setContext({ appUserId: id });
    return id;
  };
}
