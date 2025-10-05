import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import GoalModel from '@/lib/models/Goal';

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
    const updateData = await request.json();

    // Validaciones
    if (updateData.targetAmount) {
      const target = parseFloat(updateData.targetAmount);
      if (isNaN(target) || target <= 0) {
        return NextResponse.json(
          { error: 'Monto objetivo debe ser un número positivo' },
          { status: 400 }
        );
      }
      updateData.targetAmount = target;
    }

    if (updateData.currentAmount !== undefined) {
      const current = parseFloat(updateData.currentAmount);
      if (isNaN(current) || current < 0) {
        return NextResponse.json(
          { error: 'Monto actual debe ser un número positivo' },
          { status: 400 }
        );
      }
      updateData.currentAmount = current;
    }

    if (updateData.expectedAmount !== undefined && updateData.expectedAmount !== '') {
      const expected = parseFloat(updateData.expectedAmount);
      if (isNaN(expected) || expected <= 0) {
        return NextResponse.json(
          { error: 'Monto esperado debe ser un número positivo' },
          { status: 400 }
        );
      }
      updateData.expectedAmount = expected;
    }

    // Convertir fechas si existen
    if (updateData.currentDate) {
      updateData.currentDate = new Date(updateData.currentDate);
    }
    if (updateData.deadline) {
      updateData.deadline = new Date(updateData.deadline);
    }

    // Limpiar campos vacíos
    if (updateData.description === '') updateData.description = undefined;
    if (updateData.category === '') updateData.category = undefined;
    if (updateData.notes === '') updateData.notes = undefined;
    if (updateData.expectedAmount === '') delete updateData.expectedAmount;

    // Procesar tags
    if (updateData.tags) {
      updateData.tags = Array.isArray(updateData.tags)
        ? updateData.tags
        : updateData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
    }

    // Conectar a la base de datos
    await connectToDatabase();

    // Buscar y actualizar la meta
    const goal = await GoalModel.findOneAndUpdate(
      { _id: id, userId },
      updateData,
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
    console.error('❌ Error actualizando meta:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo actualizar la meta'
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

    // Eliminar la meta
    const goal = await GoalModel.findOneAndDelete({ _id: id, userId });

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
    console.error('❌ Error eliminando meta:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo eliminar la meta'
      },
      { status: 500 }
    );
  }
}
