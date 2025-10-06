import { NextRequest, NextResponse } from 'next/server';
import CategoryModel from '@/lib/models/Category';
import connectToDatabase from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    // Conectar a la base de datos
    await connectToDatabase();

    // Obtener categorías públicas (userId: null)
    const categories = await CategoryModel.find({
      userId: null,
      isDefault: true
    })
      .sort({ type: 1, name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        categories,
        message: "Categorías públicas obtenidas correctamente"
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo categorías públicas:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudieron obtener las categorías'
      },
      { status: 500 }
    );
  }
}
