import { jwtVerify } from 'jose';

export interface UserRole {
  id: string;
  name: string;
  permissions: string | string[];
}

export interface TokenPayload {
  sub: string;
  id: string;
  email: string;
  roles: UserRole[];
}

export async function verifyToken(authHeader: string): Promise<TokenPayload> {
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization header format');
  }

  const token = authHeader.substring(7);
  const secret = process.env.JWT_SECRET || 'super-secret-local-jwt-token-key-32-chars-long';

  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(secret)
  );

  return {
    ...payload,
    id: payload.sub as string,
  } as unknown as TokenPayload;
}

export async function extractAuthUser(req: Request): Promise<TokenPayload> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  return verifyToken(authHeader);
}
