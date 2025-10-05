import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import GoalModel from '../../../server/models/Goal';

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

    const goals = await GoalModel.find({ userId }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: { goals }
    });

  } catch (error) {
    console.error('❌ Error obteniendo metas:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudieron obtener las metas'
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

    const {
      name,
      description,
      currency = 'UYU',
      currentAmount = 0,
      targetAmount,
      expectedAmount,
      category,
      priority = 'medium',
      tags = [],
      notes,
      currentDate,
      deadline
    } = await request.json();

    // Validaciones
    if (!name || !targetAmount) {
      return NextResponse.json(
        { error: 'Nombre y monto objetivo son requeridos' },
        { status: 400 }
      );
    }

    const target = parseFloat(targetAmount);
    if (isNaN(target) || target <= 0) {
      return NextResponse.json(
        { error: 'Monto objetivo debe ser un número positivo' },
        { status: 400 }
      );
    }

    // Conectar a la base de datos
    await connectToDatabase();

    // Crear meta
    const goal = new GoalModel({
      userId,
      name: name.trim(),
      description: description?.trim(),
      currency,
      currentAmount: parseFloat(currentAmount || 0),
      targetAmount: target,
      expectedAmount: expectedAmount ? parseFloat(expectedAmount) : undefined,
      category: category?.trim(),
      priority,
      tags: Array.isArray(tags) ? tags : [],
      notes: notes?.trim(),
      currentDate: currentDate ? new Date(currentDate) : undefined,
      deadline: deadline ? new Date(deadline) : undefined,
      status: 'active'
    });

    await goal.save();

    return NextResponse.json({
      success: true,
      message: 'Meta creada exitosamente',
      data: { goal }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creando meta:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo crear la meta'
      },
      { status: 500 }
    );
  }
}
