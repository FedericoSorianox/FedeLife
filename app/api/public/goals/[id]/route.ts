import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import GoalModel from '@/lib/models/Goal';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const {
      name,
      description,
      currency,
      currentAmount,
      targetAmount,
      expectedAmount,
      category,
      priority,
      tags,
      notes,
      deadline,
      status
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

    // Actualizar meta
    const goal = await GoalModel.findByIdAndUpdate(
      id,
      {
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
        status
      },
      { new: true }
    );

    if (!goal) {
      return NextResponse.json(
        { error: 'Meta no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Meta actualizada exitosamente',
      data: { goal }
    });

  } catch (error) {
    console.error('❌ Error actualizando meta pública:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo actualizar la meta'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Conectar a la base de datos
    await connectToDatabase();

    // Eliminar meta
    const goal = await GoalModel.findByIdAndDelete(id);

    if (!goal) {
      return NextResponse.json(
        { error: 'Meta no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Meta eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando meta pública:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo eliminar la meta'
      },
      { status: 500 }
    );
  }
}
