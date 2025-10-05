import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    // Verificar conexión a MongoDB
    let dbStatus = 'unknown';
    let dbReadyState = 0;

    try {
      const mongoose = await connectToDatabase();
      dbReadyState = mongoose.connection.readyState;
      dbStatus = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      }[dbReadyState] || 'unknown';
    } catch (error) {
      console.error('Error conectando a DB:', error);
      dbStatus = 'error';
    }

    const healthData = {
      status: dbReadyState === 1 ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        readyState: dbReadyState
      },
      services: {
        webServer: 'OK',
        database: dbReadyState === 1 ? 'OK' : 'UNAVAILABLE',
        api: 'OK'
      },
      version: '2.0.0', // Next.js version
      framework: 'Next.js + React + Tailwind'
    };

    const statusCode = healthData.status === 'OK' ? 200 : 503;

    return NextResponse.json(healthData, { status: statusCode });

  } catch (error) {
    console.error('❌ Error en health check:', error);
    return NextResponse.json(
      {
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      },
      { status: 500 }
    );
  }
}
