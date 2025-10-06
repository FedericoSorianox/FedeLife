import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectToDatabase from '@/lib/mongodb';
import UserModel from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    // Primero intentar obtener token de cookies (sistema Next.js)
    let token = request.cookies.get('auth-token')?.value;

    // Si no hay token en cookies, intentar obtenerlo del header Authorization (sistema legacy)
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remover 'Bearer ' del inicio
      }
    }

    if (!token) {
      return NextResponse.json({
        authenticated: false,
        user: null
      });
    }

    // Verificar token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret-key'
    ) as { userId: string; email: string; username: string };

    // Conectar a la base de datos
    await connectToDatabase();

    // Obtener usuario
    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      // Token válido pero usuario no existe, limpiar cookie
      const response = NextResponse.json({
        authenticated: false,
        user: null
      });
      response.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      });
      return response;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: (user as any)._id,
        username: (user as any).username,
        email: (user as any).email,
        firstName: (user as any).firstName,
        lastName: (user as any).lastName,
        baseCurrency: (user as any).baseCurrency || 'UYU',
        isEmailVerified: (user as any).isEmailVerified || false,
        createdAt: (user as any).createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error verificando autenticación:', error);

    // Si el token es inválido, limpiar cookie
    const response = NextResponse.json({
      authenticated: false,
      user: null
    });
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    return response;
  }
}
