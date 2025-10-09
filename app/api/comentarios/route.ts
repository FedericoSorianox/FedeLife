// app/api/comentarios/route.ts
// Endpoint para manejar comentarios de cultivos
// Proporciona funcionalidades CRUD para comentarios asociados a cultivos específicos

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Comment, CommentFilters, CommentSortOptions } from '@/lib/models/Comment';

/**
 * GET /api/comentarios
 * Obtiene comentarios de cultivos con filtros y opciones de ordenamiento
 *
 * Query Parameters:
 * - cultivoId: ID del cultivo para filtrar comentarios (requerido)
 * - usuarioId: ID del usuario para filtrar comentarios (opcional)
 * - tipo: Tipo de comentario (observacion, tratamiento, cosecha, general) (opcional)
 * - activo: Filtrar solo comentarios activos (opcional, default: true)
 * - _sort: Campo por el cual ordenar (fecha, usuarioNombre, tipo) (opcional, default: fecha)
 * - _order: Orden ascendente o descendente (asc, desc) (opcional, default: desc)
 * - limit: Número máximo de comentarios a devolver (opcional, default: 50)
 * - offset: Número de comentarios a saltar para paginación (opcional, default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Conectar a la base de datos
    const client = await connectToDatabase();
    const db = client.db();

    // Obtener parámetros de consulta de la URL
    const { searchParams } = new URL(request.url);

    // Parámetros requeridos
    const cultivoId = searchParams.get('cultivoId');

    // Parámetros opcionales con valores por defecto
    const usuarioId = searchParams.get('usuarioId') || undefined;
    const tipo = searchParams.get('tipo') || undefined;
    const activoParam = searchParams.get('activo');
    const activo = activoParam !== null ? activoParam === 'true' : true; // Default: true
    const sortField = (searchParams.get('_sort') || 'fecha') as CommentSortOptions['field'];
    const sortOrder = (searchParams.get('_order') || 'desc') as CommentSortOptions['order'];
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validar parámetros requeridos
    if (!cultivoId) {
      return NextResponse.json(
        {
          error: 'Parámetro cultivoId es requerido',
          code: 'MISSING_CULTIVO_ID'
        },
        { status: 400 }
      );
    }

    // Construir filtros de consulta
    const filters: CommentFilters = {
      cultivoId,
      activo
    };

    // Agregar filtros opcionales si están presentes
    if (usuarioId) {
      filters.usuarioId = usuarioId;
    }

    if (tipo) {
      filters.tipo = tipo;
    }

    // Construir consulta MongoDB
    let query: any = {};

    // Aplicar filtros básicos
    if (filters.cultivoId) {
      query.cultivoId = filters.cultivoId;
    }

    if (filters.usuarioId) {
      query.usuarioId = filters.usuarioId;
    }

    if (filters.tipo) {
      query.tipo = filters.tipo;
    }

    if (filters.activo !== undefined) {
      query.activo = filters.activo;
    }

    // Construir opciones de ordenamiento
    const sortOptions: { [key: string]: 1 | -1 } = {};
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

    // Ejecutar consulta a la base de datos
    const comentarios = await db
      .collection('comentarios')
      .find(query)
      .sort(sortOptions)
      .skip(offset)
      .limit(limit)
      .toArray();

    // Convertir fechas de string a Date objects para respuesta JSON
    const comentariosFormateados = comentarios.map(comentario => ({
      ...comentario,
      fecha: comentario.fecha instanceof Date
        ? comentario.fecha.toISOString()
        : new Date(comentario.fecha).toISOString()
    }));

    // Retornar respuesta exitosa
    return NextResponse.json({
      success: true,
      data: comentariosFormateados,
      meta: {
        total: comentariosFormateados.length,
        cultivoId,
        filtros: filters,
        ordenamiento: { campo: sortField, orden: sortOrder },
        paginacion: { limite: limit, offset }
      }
    });

  } catch (error) {
    // Manejo de errores del servidor
    console.error('Error en GET /api/comentarios:', error);

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'Ha ocurrido un error al procesar la solicitud',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/comentarios
 * Crea un nuevo comentario para un cultivo
 *
 * Body Parameters:
 * - cultivoId: ID del cultivo (requerido)
 * - usuarioId: ID del usuario que crea el comentario (requerido)
 * - usuarioNombre: Nombre del usuario (requerido)
 * - contenido: Texto del comentario (requerido)
 * - tipo: Tipo de comentario (observacion, tratamiento, cosecha, general) (opcional, default: general)
 */
export async function POST(request: NextRequest) {
  try {
    // Conectar a la base de datos
    const client = await connectToDatabase();
    const db = client.db();

    // Obtener datos del body de la petición
    const body = await request.json();

    // Validar campos requeridos
    const { cultivoId, usuarioId, usuarioNombre, contenido, tipo = 'general' } = body;

    if (!cultivoId || !usuarioId || !usuarioNombre || !contenido) {
      return NextResponse.json(
        {
          error: 'Faltan campos requeridos: cultivoId, usuarioId, usuarioNombre, contenido',
          code: 'MISSING_REQUIRED_FIELDS'
        },
        { status: 400 }
      );
    }

    // Crear objeto de comentario
    const nuevoComentario: Omit<Comment, 'id'> = {
      cultivoId,
      usuarioId,
      usuarioNombre,
      contenido,
      tipo,
      fecha: new Date(),
      activo: true
    };

    // Insertar en la base de datos
    const resultado = await db.collection('comentarios').insertOne(nuevoComentario);

    // Retornar comentario creado
    return NextResponse.json(
      {
        success: true,
        data: {
          id: resultado.insertedId.toString(),
          ...nuevoComentario
        },
        message: 'Comentario creado exitosamente'
      },
      { status: 201 }
    );

  } catch (error) {
    // Manejo de errores del servidor
    console.error('Error en POST /api/comentarios:', error);

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: 'Ha ocurrido un error al crear el comentario',
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}
