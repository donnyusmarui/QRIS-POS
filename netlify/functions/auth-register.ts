import type { Context } from '@netlify/functions';
import { z } from 'zod';
import * as bcryptjs from 'bcryptjs';
import { createDb } from '../../db/index';
import { users, userRoles } from '../../db/schema';
import { jsonResponse, errorResponse, successResponse, corsHeaders } from './_shared/response';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  fullName: z.string().min(2),
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
    const result = registerSchema.safeParse(body);
    
    if (!result.success) {
      return errorResponse(400, 'Invalid request body');
    }
    
    const { email, password, fullName } = result.data;
    
    const db = createDb();
    
    const hash = (bcryptjs as any).default?.hash || bcryptjs.hash;
    const hashedPassword = await hash(password, 12);
    const userId = crypto.randomUUID();
    
    try {
      await db.insert(users).values({
        id: userId,
        email,
        password: hashedPassword,
        fullName,
      });
      
      const userRoleId = crypto.randomUUID();
      await db.insert(userRoles).values({
        id: userRoleId,
        userId,
        roleId: 'role_cashier',
      });
      
      return successResponse({
        id: userId,
        email,
        fullName
      }, 'Registration successful');
      
    } catch (dbError: any) {
      if (dbError.message?.includes('UNIQUE constraint failed') || dbError.code === 'SQLITE_CONSTRAINT') {
        return errorResponse(409, 'Email already exists');
      }
      throw dbError;
    }
    
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse(500, 'Internal server error');
  }
};
