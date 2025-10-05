import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Crear respuesta
    const response = NextResponse.json({
      success: true,
      message: 'Logout exitoso'
    });

    // Eliminar cookie de autenticación
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    console.log('✅ Usuario cerró sesión exitosamente');

    return response;

  } catch (error) {
    console.error('❌ Error en logout:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo procesar el logout'
      },
      { status: 500 }
    );
  }
}
