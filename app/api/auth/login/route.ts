import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import UserModel from '@/lib/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Configuración de expiración JWT
const JWT_NO_EXPIRE = process.env.JWT_NO_EXPIRE === 'true';

export async function POST(request: NextRequest) {
  try {
    const { identifier, password } = await request.json();

    // Validaciones
    if (!identifier || typeof identifier !== 'string' || identifier.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Datos de login inválidos',
          message: 'El email/usuario es requerido y debe ser una cadena válida'
        },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Datos de login inválidos',
          message: 'La contraseña es requerida y debe ser una cadena válida'
        },
        { status: 400 }
      );
    }

    // Conectar a la base de datos
    await connectToDatabase();

    // Buscar usuario por email o username
    const user = await UserModel.findOne({
      $or: [
        { email: identifier.trim().toLowerCase() },
        { username: identifier.trim() }
      ]
    }).select('+password') as any;

    if (!user) {
      return NextResponse.json(
        {
          error: 'Credenciales inválidas',
          message: 'Usuario o contraseña incorrectos'
        },
        { status: 401 }
      );
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password.trim(), user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error: 'Credenciales inválidas',
          message: 'Usuario o contraseña incorrectos'
        },
        { status: 401 }
      );
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        userId: (user as any)._id,
        email: (user as any).email,
        username: (user as any).username
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      JWT_NO_EXPIRE ? {} : { expiresIn: '24h' }
    );

    // Crear respuesta con cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: {
          id: (user as any)._id,
          username: (user as any).username,
          email: (user as any).email,
          firstName: (user as any).firstName,
          lastName: (user as any).lastName,
          baseCurrency: (user as any).baseCurrency || 'UYU',
          createdAt: (user as any).createdAt
        },
        token: token
      }
    });

    // Configurar cookie segura
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: JWT_NO_EXPIRE ? undefined : 24 * 60 * 60 * 1000, // 24 horas
      path: '/'
    });

    console.log(`✅ Usuario ${(user as any).username} inició sesión exitosamente`);

    return response;

  } catch (error) {
    console.error('❌ Error en login:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo procesar el login'
      },
      { status: 500 }
    );
  }
}
