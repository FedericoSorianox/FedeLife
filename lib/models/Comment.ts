// lib/models/Comment.ts
// Modelo de datos para comentarios de cultivos
// Este modelo define la estructura de datos para comentarios asociados a cultivos

export interface Comment {
  id: string;
  cultivoId: string;
  usuarioId: string;
  usuarioNombre: string;
  contenido: string;
  fecha: Date;
  tipo: 'observacion' | 'tratamiento' | 'cosecha' | 'general';
  activo: boolean;
}

// Tipo para filtros de consulta
export interface CommentFilters {
  cultivoId?: string;
  usuarioId?: string;
  tipo?: string;
  activo?: boolean;
}

// Tipo para opciones de ordenamiento
export interface CommentSortOptions {
  field: 'fecha' | 'usuarioNombre' | 'tipo';
  order: 'asc' | 'desc';
}
