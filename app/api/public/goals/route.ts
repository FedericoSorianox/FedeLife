import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import GoalModel from '../../../../server/models/Goal';

export async function GET(request: NextRequest) {
  try {
    // Conectar a la base de datos
    await connectToDatabase();

    // Para demo público, devolver goals de ejemplo o todos
    const goals = await GoalModel.find({}).sort({ createdAt: -1 }).limit(20);

    return NextResponse.json({
      success: true,
      data: { goals }
    });

  } catch (error) {
    console.error('❌ Error obteniendo metas públicas:', error);
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

    // Crear meta sin userId (pública)
    const goal = new GoalModel({
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
    console.error('❌ Error creando meta pública:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo crear la meta'
      },
      { status: 500 }
    );
  }
}
