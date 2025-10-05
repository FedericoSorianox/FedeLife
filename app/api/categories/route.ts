import { NextRequest, NextResponse } from 'next/server';
import CategoryModel from '@/server/models/Category';
import connectToDatabase from '@/lib/mongodb';

// Función para obtener userId del token
function getUserIdFromToken(request: NextRequest): string | null {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret-key'
    ) as { userId: string };

    return decoded.userId;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Conectar a la base de datos
    await connectToDatabase();

    const categories = await CategoryModel.find({
      $or: [
        { userId },
        { userId: null } // Categorías por defecto
      ]
    }).sort({ type: 1, name: 1 });

    return NextResponse.json({
      success: true,
      data: { categories }
    });

  } catch (error) {
    console.error('❌ Error obteniendo categorías:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudieron obtener las categorías'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

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

    // Verificar que no exista una categoría con el mismo nombre para este usuario
    const existingCategory = await CategoryModel.findOne({
      userId,
      name: name.trim(),
      type
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Ya existe una categoría con este nombre' },
        { status: 409 }
      );
    }

    // Crear categoría
    const category = new CategoryModel({
      userId,
      name: name.trim(),
      type,
      color,
      description: description?.trim(),
      isDefault: false
    });

    await category.save();

    return NextResponse.json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: { category }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creando categoría:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo crear la categoría'
      },
      { status: 500 }
    );
  }
}
