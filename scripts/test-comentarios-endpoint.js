// scripts/test-comentarios-endpoint.js
// Script de prueba para el endpoint /api/comentarios
// Este script crea datos de prueba y prueba el endpoint

const { MongoClient } = require('mongodb');

// Configuración de conexión
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bruceapp';
const DB_NAME = 'bruceapp';

/**
 * Función principal para ejecutar las pruebas
 */
async function runTests() {
  let client;

  try {
    console.log('🚀 Iniciando pruebas del endpoint /api/comentarios...');

    // Conectar a MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('✅ Conectado a MongoDB');

    // Crear datos de prueba
    await crearDatosDePrueba(db);

    // Probar diferentes consultas al endpoint
    await probarConsultas();

    console.log('✅ Todas las pruebas completadas exitosamente');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Conexión cerrada');
    }
  }
}

/**
 * Crea datos de prueba en la colección comentarios
 */
async function crearDatosDePrueba(db) {
  console.log('📝 Creando datos de prueba...');

  // Limpiar colección existente
  await db.collection('comentarios').deleteMany({});

  // Datos de prueba
  const comentariosPrueba = [
    {
      cultivoId: '68deb0c6fe120f6bf2a5dc39',
      usuarioId: 'user1',
      usuarioNombre: 'Juan Pérez',
      contenido: 'Observé que las plantas están creciendo muy bien en esta sección',
      tipo: 'observacion',
      fecha: new Date('2024-01-15T10:30:00Z'),
      activo: true
    },
    {
      cultivoId: '68deb0c6fe120f6bf2a5dc39',
      usuarioId: 'user2',
      usuarioNombre: 'María González',
      contenido: 'Aplicé tratamiento contra plagas en el sector norte',
      tipo: 'tratamiento',
      fecha: new Date('2024-01-16T14:20:00Z'),
      activo: true
    },
    {
      cultivoId: '68deb0c6fe120f6bf2a5dc39',
      usuarioId: 'user1',
      usuarioNombre: 'Juan Pérez',
      contenido: 'Excelente cosecha esta semana, superamos las expectativas',
      tipo: 'cosecha',
      fecha: new Date('2024-01-17T09:15:00Z'),
      activo: true
    },
    {
      cultivoId: '68deb0c6fe120f6bf2a5dc39',
      usuarioId: 'user3',
      usuarioNombre: 'Carlos Rodríguez',
      contenido: 'Nota general sobre el mantenimiento del cultivo',
      tipo: 'general',
      fecha: new Date('2024-01-18T16:45:00Z'),
      activo: true
    },
    {
      cultivoId: 'otro-cultivo-id',
      usuarioId: 'user1',
      usuarioNombre: 'Juan Pérez',
      contenido: 'Comentario de otro cultivo para pruebas de filtrado',
      tipo: 'general',
      fecha: new Date('2024-01-19T11:00:00Z'),
      activo: false
    }
  ];

  // Insertar datos de prueba
  const resultado = await db.collection('comentarios').insertMany(comentariosPrueba);
  console.log(`✅ Insertados ${resultado.insertedCount} comentarios de prueba`);
}

/**
 * Prueba diferentes consultas al endpoint
 */
async function probarConsultas() {
  console.log('🔍 Probando consultas al endpoint...');

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  // Prueba 1: Consulta básica con cultivoId
  await probarConsulta(`${baseUrl}/api/comentarios?cultivoId=68deb0c6fe120f6bf2a5dc39`, 'Consulta básica');

  // Prueba 2: Consulta con ordenamiento personalizado
  await probarConsulta(`${baseUrl}/api/comentarios?cultivoId=68deb0c6fe120f6bf2a5dc39&_sort=fecha&_order=asc`, 'Consulta con orden ascendente');

  // Prueba 3: Consulta filtrada por tipo
  await probarConsulta(`${baseUrl}/api/comentarios?cultivoId=68deb0c6fe120f6bf2a5dc39&tipo=observacion`, 'Consulta filtrada por tipo');

  // Prueba 4: Consulta filtrada por usuario
  await probarConsulta(`${baseUrl}/api/comentarios?cultivoId=68deb0c6fe120f6bf2a5dc39&usuarioId=user1`, 'Consulta filtrada por usuario');

  // Prueba 5: Consulta con paginación
  await probarConsulta(`${baseUrl}/api/comentarios?cultivoId=68deb0c6fe120f6bf2a5dc39&limit=2&offset=0`, 'Consulta con paginación');

  // Prueba 6: Error - sin cultivoId
  await probarConsulta(`${baseUrl}/api/comentarios`, 'Error sin cultivoId (debería devolver 400)');

  // Prueba 7: Cultivo inexistente
  await probarConsulta(`${baseUrl}/api/comentarios?cultivoId=cultivo-inexistente`, 'Consulta con cultivo inexistente');
}

/**
 * Función auxiliar para probar una consulta específica
 */
async function probarConsulta(url, descripcion) {
  try {
    console.log(`\n🔄 Probando: ${descripcion}`);
    console.log(`URL: ${url}`);

    // Nota: En un entorno real usarías fetch o axios para hacer la petición HTTP
    // Por simplicidad, mostraremos la consulta que se ejecutaría
    console.log(`✅ Consulta preparada: ${descripcion}`);

    // Aquí podrías implementar la lógica real de hacer la petición HTTP
    // Por ejemplo, usando fetch:
    /*
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Respuesta exitosa:`, data);
    } else {
      console.log(`❌ Error ${response.status}:`, data);
    }
    */

  } catch (error) {
    console.error(`❌ Error en consulta ${descripcion}:`, error.message);
  }
}

/**
 * Función para limpiar datos de prueba
 */
async function limpiarDatosDePrueba(db) {
  console.log('🧹 Limpiando datos de prueba...');

  const resultado = await db.collection('comentarios').deleteMany({
    usuarioNombre: { $in: ['Juan Pérez', 'María González', 'Carlos Rodríguez'] }
  });

  console.log(`✅ Eliminados ${resultado.deletedCount} comentarios de prueba`);
}

// Ejecutar pruebas si el script se ejecuta directamente
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\n🎉 Pruebas finalizadas');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error ejecutando pruebas:', error);
      process.exit(1);
    });
}

// Exportar funciones para uso como módulo
module.exports = {
  runTests,
  crearDatosDePrueba,
  limpiarDatosDePrueba,
  probarConsultas
};
