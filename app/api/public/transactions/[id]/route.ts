import { NextRequest, NextResponse } from 'next/server';
import TransactionModel from '@/lib/models/Transaction';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';

// Verificar que el modelo esté disponible
console.log('🔍 TransactionModel disponible:', !!TransactionModel);
console.log('🔍 connectToDatabase disponible:', !!connectToDatabase);
console.log('🔍 mongoose disponible:', !!mongoose);

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    console.log(`🔍 DELETE request recibido para ID: ${JSON.stringify(params)}`);

    try {
        const { id } = params;

        if (!id) {
            console.log('❌ ID no proporcionado');
            return NextResponse.json(
                { error: 'ID de transacción requerido' },
                { status: 400 }
            );
        }

        console.log(`🔍 Validando ID: ${id}`);

        // Validar que el ID sea un ObjectId válido de MongoDB
        if (!mongoose.isValidObjectId(id)) {
            console.log('❌ ID no es válido ObjectId');
            return NextResponse.json(
                {
                    error: 'ID inválido',
                    message: 'El ID de la transacción no es válido'
                },
                { status: 400 }
            );
        }

        console.log('🔗 Conectando a base de datos...');
        // Conectar a la base de datos
        await connectToDatabase();
        console.log('✅ Conectado a base de datos');

        console.log(`🔍 Buscando transacción con ID: ${id} y userId: null`);
        // Buscar y eliminar la transacción (solo transacciones públicas con userId: null)
        const transaction = await TransactionModel.findOneAndDelete({
            _id: id,
            userId: null // Solo permite eliminar transacciones públicas/demo
        });

        console.log(`🔍 Resultado de búsqueda:`, transaction ? 'Encontrada' : 'No encontrada');

        if (!transaction) {
            console.log('❌ Transacción no encontrada o no es pública');
            return NextResponse.json(
                {
                    error: 'Transacción no encontrada',
                    message: 'La transacción especificada no existe o no es una transacción pública'
                },
                { status: 404 }
            );
        }

        console.log(`🗑️ Transacción pública eliminada: ${transaction.type} - $${transaction.amount} - ${transaction.description}`);

        return NextResponse.json({
            success: true,
            message: 'Transacción eliminada exitosamente'
        });

    } catch (error) {
        console.error('❌ Error eliminando transacción pública:', error);
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack available');

        // Manejar errores de MongoDB ObjectId inválido
        if (error instanceof Error && error.name === 'CastError') {
            console.log('❌ Error de CastError detectado');
            return NextResponse.json(
                {
                    error: 'ID inválido',
                    message: 'El ID de la transacción no es válido'
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                error: 'Error interno del servidor',
                message: 'No se pudo eliminar la transacción',
                details: error instanceof Error ? error.message : 'Error desconocido',
                errorName: error instanceof Error ? error.name : 'Unknown',
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        if (!id) {
            return NextResponse.json(
                { error: 'ID de transacción requerido' },
                { status: 400 }
            );
        }

        // Validar que el ID sea un ObjectId válido de MongoDB
        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json(
                {
                    error: 'ID inválido',
                    message: 'El ID de la transacción no es válido'
                },
                { status: 400 }
            );
        }

        // Conectar a la base de datos
        await connectToDatabase();

        // Buscar la transacción (solo transacciones públicas con userId: null)
        const transaction = await TransactionModel.findOne({
            _id: id,
            userId: null
        }).lean();

        if (!transaction) {
            return NextResponse.json(
                {
                    error: 'Transacción no encontrada',
                    message: 'La transacción especificada no existe o no es una transacción pública'
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: { transaction }
        });

    } catch (error) {
        console.error('❌ Error obteniendo transacción pública:', error);

        // Manejar errores de MongoDB ObjectId inválido
        if (error instanceof Error && error.name === 'CastError') {
            return NextResponse.json(
                {
                    error: 'ID inválido',
                    message: 'El ID de la transacción no es válido'
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                error: 'Error interno del servidor',
                message: 'No se pudo obtener la transacción',
                details: error instanceof Error ? error.message : 'Error desconocido'
            },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        if (!id) {
            return NextResponse.json(
                { error: 'ID de transacción requerido' },
                { status: 400 }
            );
        }

        const {
            type,
            amount,
            description,
            category,
            date,
            currency = 'UYU',
            tags = [],
            notes,
            status = 'completed'
        } = await request.json();

        // Validaciones básicas
        if (type && !['income', 'expense'].includes(type)) {
            return NextResponse.json(
                { error: 'Tipo de transacción inválido' },
                { status: 400 }
            );
        }

        if (amount && (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
            return NextResponse.json(
                { error: 'Monto inválido' },
                { status: 400 }
            );
        }

        // Conectar a la base de datos
        await connectToDatabase();

        // Preparar datos de actualización
        const updateData: any = {};
        if (type) updateData.type = type;
        if (amount) updateData.amount = parseFloat(amount);
        if (description) updateData.description = description.trim();
        if (category) updateData.category = category.trim();
        if (date) updateData.date = new Date(date);
        if (currency) updateData.currency = currency;
        if (tags) updateData.tags = tags.filter((tag: string) => tag.trim());
        if (notes !== undefined) updateData.notes = notes?.trim();
        if (status) updateData.status = status;

        // Actualizar transacción (solo transacciones públicas con userId: null)
        const transaction = await TransactionModel.findOneAndUpdate(
            { _id: id, userId: null },
            updateData,
            { new: true, runValidators: true }
        );

        if (!transaction) {
            return NextResponse.json(
                {
                    error: 'Transacción no encontrada',
                    message: 'La transacción especificada no existe o no es una transacción pública'
                },
                { status: 404 }
            );
        }

        console.log(`📝 Transacción pública actualizada: ${transaction.type} - $${transaction.amount} - ${transaction.description}`);

        return NextResponse.json({
            success: true,
            message: 'Transacción actualizada exitosamente',
            data: { transaction }
        });

    } catch (error) {
        console.error('❌ Error actualizando transacción pública:', error);

        // Manejar errores de MongoDB ObjectId inválido
        if (error instanceof Error && error.name === 'CastError') {
            return NextResponse.json(
                {
                    error: 'ID inválido',
                    message: 'El ID de la transacción no es válido'
                },
                { status: 400 }
            );
        }

        // Manejar errores de validación
        if (error instanceof Error && error.name === 'ValidationError') {
            return NextResponse.json(
                {
                    error: 'Datos inválidos',
                    message: error.message
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                error: 'Error interno del servidor',
                message: 'No se pudo actualizar la transacción'
            },
            { status: 500 }
        );
    }
}
