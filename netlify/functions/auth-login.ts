import type { Context } from '@netlify/functions';
import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import { SignJWT } from 'jose';
import { createDb } from '../../db/index';
import { users, userRoles, roles } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { jsonResponse, errorResponse, successResponse, corsHeaders } from './_shared/response';

const compare = (bcryptjs as any).default?.compare || bcryptjs.compare;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default async (req: Request, context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return errorResponse(400, 'Invalid request body');
    }
    
    const { email, password } = result.data;
    
    const db = createDb();
    
    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = userResult[0];
    
    if (!user) {
      return errorResponse(401, 'Invalid email or password');
    }
    
    const isValid = await compare(password, user.password);
    
    if (!isValid) {
      return errorResponse(401, 'Invalid email or password');
    }
    
    const userRolesData = await db
      .select({
        id: roles.id,
        name: roles.name,
        permissions: roles.permissions
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));
      
    const secret = process.env.JWT_SECRET || 'super-secret-local-jwt-token-key-32-chars-long';
    
    const secretKey = new TextEncoder().encode(secret);
    
    const tokenPayload = {
      sub: user.id,
      email: user.email,
      roles: userRolesData
    };
    
    const accessToken = await new SignJWT(tokenPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secretKey);
      
    const refreshToken = await new SignJWT({ sub: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secretKey);
      
    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: userRolesData
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(500, error?.message || String(error));
  }
};
