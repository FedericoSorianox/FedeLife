import { NextRequest, NextResponse } from 'next/server';
import CategoryModel from '@/lib/models/Category';
import connectToDatabase from '@/lib/mongodb';

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

    // Verificar si es una petición especial para crear categorías por defecto
    const { createDefaultCategories } = await request.json();
    if (createDefaultCategories) {
      return await handleCreateDefaultCategories();
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

// Función para crear categorías por defecto del sistema
async function handleCreateDefaultCategories() {
  try {
    // Conectar a la base de datos
    await connectToDatabase();

    // Categorías por defecto del sistema
    const defaultCategories = [
      // Categorías de Ingresos
      { name: 'Salario', type: 'income', color: '#10B981', description: 'Ingresos por trabajo', userId: null, isDefault: true },
      { name: 'Freelance', type: 'income', color: '#3B82F6', description: 'Trabajos independientes', userId: null, isDefault: true },
      { name: 'Inversiones', type: 'income', color: '#8B5CF6', description: 'Ganancias de inversiones', userId: null, isDefault: true },
      { name: 'Alquiler', type: 'income', color: '#06B6D4', description: 'Ingresos por alquiler', userId: null, isDefault: true },
      { name: 'Otros Ingresos', type: 'income', color: '#84CC16', description: 'Otros ingresos varios', userId: null, isDefault: true },

      // Categorías de Gastos
      { name: 'Alimentación', type: 'expense', color: '#EF4444', description: 'Comida y restaurantes', userId: null, isDefault: true },
      { name: 'Transporte', type: 'expense', color: '#F59E0B', description: 'Transporte público y combustible', userId: null, isDefault: true },
      { name: 'Servicios', type: 'expense', color: '#F97316', description: 'Luz, agua, gas, internet', userId: null, isDefault: true },
      { name: 'Entretenimiento', type: 'expense', color: '#8B5CF6', description: 'Cine, teatro, hobbies', userId: null, isDefault: true },
      { name: 'Salud', type: 'expense', color: '#10B981', description: 'Médicos, medicamentos, seguros', userId: null, isDefault: true },
      { name: 'Educación', type: 'expense', color: '#3B82F6', description: 'Cursos, libros, educación', userId: null, isDefault: true },
      { name: 'Ropa', type: 'expense', color: '#EC4899', description: 'Ropa y accesorios', userId: null, isDefault: true },
      { name: 'Casa', type: 'expense', color: '#6B7280', description: 'Mantenimiento del hogar', userId: null, isDefault: true },
      { name: 'Transferencias', type: 'expense', color: '#6366F1', description: 'Transferencias entre cuentas', userId: null, isDefault: true },
      { name: 'Otros Gastos', type: 'expense', color: '#94A3B8', description: 'Otros gastos varios', userId: null, isDefault: true }
    ];

    // Verificar qué categorías ya existen
    const existingCategories = await CategoryModel.find({ userId: null, isDefault: true });
    const existingNames = existingCategories.map(cat => cat.name);

    // Filtrar categorías que no existen aún
    const categoriesToCreate = defaultCategories.filter(cat => !existingNames.includes(cat.name));

    if (categoriesToCreate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Todas las categorías por defecto ya existen',
        data: { categories: existingCategories }
      });
    }

    // Crear categorías faltantes
    const createdCategories = await CategoryModel.insertMany(categoriesToCreate);

    return NextResponse.json({
      success: true,
      message: `Se crearon ${categoriesToCreate.length} categorías por defecto`,
      data: { categories: [...existingCategories, ...createdCategories] }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creando categorías por defecto:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudieron crear las categorías por defecto'
      },
      { status: 500 }
    );
  }
}
