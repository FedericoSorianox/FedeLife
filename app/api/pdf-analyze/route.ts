/**
 * 📄 API ROUTE DE ANÁLISIS DE PDF - NEXT.JS
 *
 * Endpoint para análisis de PDFs con IA integrada usando Next.js API Routes
 * Versión unificada que elimina la necesidad del servidor Express separado
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pdfParse from 'pdf-parse-fixed';
import { analyzeTextWithEnvKey, analyzeLargeTextInChunks } from '@/server/services/aiService';
import connectToDatabase from '@/lib/mongodb';

// Función para obtener userId del token (igual que otras rutas)
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

// Función para optimizar texto
function optimizeTextForAnalysis(text: string): string {
  return text
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\u00C0-\u017F.,;:!?()[\]{}"'-]/g, '')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación JWT
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Token de acceso requerido',
          message: 'Debes incluir un token JWT válido'
        },
        { status: 401 }
      );
    }

    // Obtener el FormData
    const formData = await request.formData();
    const file = formData.get('pdf') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No se encontró el archivo PDF' },
        { status: 400 }
      );
    }

    // Validar tipo y tamaño
    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'El archivo debe ser un PDF válido' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo es demasiado grande. Máximo 10MB permitido' },
        { status: 400 }
      );
    }

    console.log('📄 Procesando PDF para análisis...');

    // Conectar a la base de datos si es necesario
    await connectToDatabase();

    // Convertir File a Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extraer texto del PDF
    console.log('📄 Extrayendo texto del PDF...');
    let extractedText = '';

    try {
      const data = await pdfParse(buffer);
      extractedText = data.text;
      console.log(`📄 Texto extraído: ${extractedText.length} caracteres`);
    } catch (pdfError) {
      console.error('❌ Error extrayendo texto del PDF:', pdfError);
      return NextResponse.json(
        { error: 'Error procesando el PDF. Verifica que el archivo no esté corrupto.' },
        { status: 400 }
      );
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No se pudo extraer texto del PDF. El archivo puede estar vacío o contener solo imágenes.' },
        { status: 400 }
      );
    }

    // Optimizar texto para análisis
    console.log('🔧 Optimizando texto para análisis...');
    const optimizedText = optimizeTextForAnalysis(extractedText);

    if (optimizedText.length < 50) {
      return NextResponse.json(
        { error: 'El PDF contiene muy poco texto para analizar. Necesita al menos contenido básico de una transacción.' },
        { status: 400 }
      );
    }

    // Analizar con IA
    console.log('🤖 Enviando a análisis con OpenAI...');

    let analysisResult;

    // Si el texto es muy largo, dividirlo en chunks
    const MAX_CHUNK_SIZE = 50000;
    if (optimizedText.length > MAX_CHUNK_SIZE) {
      console.log(`📄 Texto muy largo (${optimizedText.length} chars), procesando en chunks...`);
      analysisResult = await analyzeLargeTextInChunks(optimizedText, userId);
    } else {
      analysisResult = await analyzeTextWithEnvKey(optimizedText, userId);
    }

    if (!analysisResult || !analysisResult.expenses) {
      console.error('❌ Error en el análisis de IA:', analysisResult);
      return NextResponse.json(
        { error: 'Error en el análisis con IA. Revisa tu configuración.' },
        { status: 500 }
      );
    }

    console.log('✅ Análisis completado exitosamente');

    // Formatear respuesta
    const response = {
      success: true,
      analysis: {
        expenses: analysisResult.expenses || [],
        summary: {
          totalExpenses: analysisResult.expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0,
          expenseCount: analysisResult.expenses?.length || 0,
          currency: 'UYU'
        },
        confidence: analysisResult.confidence || 0.8,
        aiModel: 'OpenAI GPT-4o-mini',
        analysisTimestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error procesando PDF:', error);

    let errorMessage = 'Error interno del servidor';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
