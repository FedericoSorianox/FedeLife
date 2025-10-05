import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { processAdvancedQuery } from '@/lib/services/aiService';
import jwt from 'jsonwebtoken';

// Función para obtener userId del token
function getUserIdFromToken(request: NextRequest): string | null {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return null;

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret-key'
    ) as { userId: string };

    return decoded.userId;
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, goalsData, financialData } = await request.json();

    // Verificar autenticación JWT
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Token de acceso requerido',
          message: 'Debes incluir un token JWT válido en el header Authorization'
        },
        { status: 401 }
      );
    }

    // Conectar a la base de datos
    await connectToDatabase();

    // Crear contexto completo del usuario para la IA
    const contextData = {
      goals: goalsData || [],
      financialSummary: financialData || {},
      queryType: 'goals_chat'
    };

    // Procesar la consulta con IA usando el contexto completo del usuario
    const result = await processAdvancedQuery(query, userId, contextData);

    return NextResponse.json({
      success: true,
      response: result.response,
      dataPoints: result.dataPoints,
      timestamp: result.timestamp
    });

  } catch (error) {
    console.error('❌ Error procesando consulta de IA para metas:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo procesar la consulta de IA'
      },
      { status: 500 }
    );
  }
}
