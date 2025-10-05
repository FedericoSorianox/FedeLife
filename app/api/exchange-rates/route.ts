import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { exchangeRateService } from '@/server/services/exchangeRate';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromCurrency = searchParams.get('from') || 'UYU';
    const toCurrency = searchParams.get('to') || 'USD';
    const date = searchParams.get('date');

    // Conectar a la base de datos
    await connectToDatabase();

    // Obtener tasa de cambio
    const rate = await exchangeRateService.getExchangeRate(
      fromCurrency,
      toCurrency,
      date ? new Date(date) : new Date()
    );

    return NextResponse.json({
      success: true,
      data: {
        fromCurrency,
        toCurrency,
        rate,
        date: date || new Date().toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo tasa de cambio:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'No se pudo obtener la tasa de cambio'
      },
      { status: 500 }
    );
  }
}
