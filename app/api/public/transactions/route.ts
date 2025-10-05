import { NextRequest, NextResponse } from 'next/server';
import TransactionModel from '@/server/models/Transaction';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Conectar a la base de datos
    await connectToDatabase();

    // Construir filtros para transacciones públicas
    const filters: any = { userId: null };

    if (type) filters.type = type;
    if (category) filters.category = category;

    // Filtros de fecha
    if (month || year) {
      filters.date = {};
      if (month) {
        const [yearNum, monthNum] = month.split('-');
        filters.date.$gte = new Date(parseInt(yearNum), parseInt(monthNum) - 1, 1);
        filters.date.$lt = new Date(parseInt(yearNum), parseInt(monthNum), 1);
      }
      if (year) {
        filters.date.$gte = new Date(parseInt(year), 0, 1);
        filters.date.$lt = new Date(parseInt(year) + 1, 0, 1);
      }
    }

    // Aplicar paginación
    const skip = (page - 1) * limit;
    const transactions = await TransactionModel.find(filters)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Contar total
    const total = await TransactionModel.countDocuments(filters);

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo transacciones públicas:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudieron obtener las transacciones'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      type,
      amount,
      description,
      category,
      date = new Date(),
      currency = 'UYU',
      tags = [],
      notes,
      status = 'completed'
    } = await request.json();

    // Conectar a la base de datos
    await connectToDatabase();

    // Crear transacción con usuario demo
    const transaction = new TransactionModel({
      userId: null, // Usuario demo para transacciones públicas
      type,
      amount: parseFloat(amount),
      description: description.trim(),
      category: category.trim(),
      date: new Date(date),
      currency,
      tags: tags.filter((tag: string) => tag.trim()),
      notes: notes?.trim(),
      status
    });

    // Establecer valores por defecto para moneda
    transaction.convertedAmount = transaction.amount;
    transaction.userBaseCurrency = currency;
    transaction.exchangeRate = 1;
    transaction.exchangeRateDate = new Date();

    await transaction.save();

    return NextResponse.json({
      success: true,
      message: 'Transacción creada exitosamente',
      data: { transaction }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creando transacción pública:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        message: 'No se pudo crear la transacción'
      },
      { status: 500 }
    );
  }
}
