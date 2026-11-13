// Product roles come from the server-controlled authentication identity record.
export const Role = { Admin: "admin", User: "user" } as const;
export type Role = (typeof Role)[keyof typeof Role];
export const roles = Object.values(Role);

export const Permission = {
  GamesRead: "games:read",
  GamesUpdate: "games:update",
  CatalogUpdate: "catalog:update",
  SettingsUpdate: "settings:update",
  UsersManage: "users:manage",
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];
export const permissions = Object.values(Permission);

const policy: Record<Role, ReadonlySet<Permission>> = {
  [Role.Admin]: new Set(permissions),
  [Role.User]: new Set([Permission.GamesRead, Permission.GamesUpdate, Permission.SettingsUpdate]),
};

export const defaultRole: Role = Role.User;

export function can(role: Role | undefined, permission: Permission): boolean {
  return role !== undefined && (policy[role]?.has(permission) ?? false);
}
