import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import CategoryModel from '@/lib/models/Category';

// Función para obtener userId del token (soporta cookies y headers Authorization)
function getUserIdFromToken(request: NextRequest): string | null {
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

    if (!token) return null;

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret-key'
    ) as { userId: string };

    return decoded.userId;
  } catch (error) {
    console.error('Error decodificando token:', error);
    return null;
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = params;
    const { name, type, color, description } = await request.json();

    // Validaciones
    if (!name || !type || !color) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    if (!['income', 'expense'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de categoría inválido' },
        { status: 400 }
      );
    }

    // Conectar a la base de datos
    await connectToDatabase();

    // Buscar y actualizar la categoría
    const category = await CategoryModel.findOneAndUpdate(
      { _id: id, userId }, // Solo permitir editar categorías del usuario
      {
        name: name.trim(),
        type,
        color,
        description: description?.trim()
      },
      { new: true }
    );

    if (!category) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: { category }
    });

  } catch (error) {
    console.error('❌ Error actualizando categoría:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo actualizar la categoría'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Conectar a la base de datos
    await connectToDatabase();

    // Verificar que la categoría no sea por defecto antes de eliminar
    const category = await CategoryModel.findOne({ _id: id, userId });

    if (!category) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    if (category.isDefault) {
      return NextResponse.json(
        { error: 'No se pueden eliminar categorías por defecto' },
        { status: 400 }
      );
    }

    // Eliminar la categoría
    await CategoryModel.findOneAndDelete({ _id: id, userId });

    return NextResponse.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando categoría:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo eliminar la categoría'
      },
      { status: 500 }
    );
  }
}
