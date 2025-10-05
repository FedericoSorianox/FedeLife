import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import UserModel from '@/lib/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Configuración de expiración JWT
const JWT_NO_EXPIRE = process.env.JWT_NO_EXPIRE === 'true';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password, firstName, lastName, currency = 'UYU' } = await request.json();

    // Validaciones
    const errors = [];

    if (!username || username.length < 3) {
      errors.push('El nombre de usuario debe tener al menos 3 caracteres');
    }

    if (!email || !email.includes('@')) {
      errors.push('El email debe ser válido');
    }

    if (!password || password.length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    if (!firstName || firstName.trim().length === 0) {
      errors.push('El nombre es requerido');
    }

    if (!lastName || lastName.trim().length === 0) {
      errors.push('El apellido es requerido');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Datos de registro inválidos',
          details: errors
        },
        { status: 400 }
      );
    }

    // Conectar a la base de datos
    await connectToDatabase();

    // Verificar si el usuario ya existe
    const existingUser = await UserModel.findOne({
      $or: [
        { email: email.trim().toLowerCase() },
        { username: username.trim().toLowerCase() }
      ]
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'Usuario ya existe',
          message: 'Ya existe una cuenta con este email o nombre de usuario'
        },
        { status: 409 }
      );
    }

    // Encriptar contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear nuevo usuario
    const user = new UserModel({
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      baseCurrency: currency,
      isEmailVerified: false
    });

    await user.save();

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

    // Crear respuesta
    const response = NextResponse.json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: {
          id: (user as any)._id,
          username: (user as any).username,
          email: (user as any).email,
          firstName: (user as any).firstName,
          lastName: (user as any).lastName,
          baseCurrency: (user as any).baseCurrency || 'UYU',
          isEmailVerified: (user as any).isEmailVerified || false,
          createdAt: (user as any).createdAt
        },
        token
      }
    }, { status: 201 });

    // Configurar cookie segura
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: JWT_NO_EXPIRE ? undefined : 24 * 60 * 60 * 1000,
      path: '/'
    });

    console.log(`✅ Usuario ${(user as any).username} registrado exitosamente`);

    return response;

  } catch (error) {
    console.error('❌ Error en registro:', error);

    // Manejar errores específicos de MongoDB
    if ((error as any).code === 11000) {
      return NextResponse.json(
        {
          error: 'Usuario ya existe',
          message: 'Ya existe una cuenta con este email o nombre de usuario'
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo procesar el registro'
      },
      { status: 500 }
    );
  }
}
