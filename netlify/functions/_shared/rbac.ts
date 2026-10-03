import { extractAuthUser, TokenPayload, UserRole } from './auth-middleware';

export function hasPermission(userRoles: UserRole[], permission: string): boolean {
  return userRoles.some(role => {
    if (Array.isArray(role.permissions)) {
      return role.permissions.includes(permission);
    }
    if (typeof role.permissions === 'string') {
      try {
        const perms = JSON.parse(role.permissions);
        return Array.isArray(perms) && perms.includes(permission);
      } catch (e) {
        return false;
      }
    }
    return false;
  });
}

export async function requirePermission(req: Request, permission: string): Promise<{ user: TokenPayload }> {
  try {
    const user = await extractAuthUser(req);
    
    if (!hasPermission(user.roles, permission)) {
      throw { statusCode: 403, message: 'Forbidden' };
    }
    
    return { user };
  } catch (error: any) {
    if (error.statusCode === 403) {
      throw error;
    }
    throw { statusCode: 401, message: 'Unauthorized' };
  }
}
