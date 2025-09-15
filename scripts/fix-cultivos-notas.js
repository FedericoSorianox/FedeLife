/**
 * Script de migración para arreglar el campo 'notas' en cultivos existentes
 *
 * Este script corrige cultivos que tienen el campo 'notas' como cadena vacía
 * en lugar del array esperado por el esquema.
 *
 * Uso: node scripts/fix-cultivos-notas.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Configuración de MongoDB (igual que en server/index.js)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fede-life-finanzas';

async function fixCultivosNotas() {
    console.log('🔧 Iniciando migración de campo "notas" en cultivos...');

    try {
        // Conectar a MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Obtener la colección de cultivos
        const Cultivo = mongoose.connection.db.collection('cultivos');

        // Buscar cultivos que tienen el campo notas como string vacío
        const cultivosMalformados = await Cultivo.find({
            $or: [
                { notas: "" },
                { notas: { $type: "string" } }
            ]
        }).toArray();

        console.log(`📊 Encontrados ${cultivosMalformados.length} cultivos con campo "notas" malformado`);

        if (cultivosMalformados.length === 0) {
            console.log('✅ No se encontraron cultivos con problemas. Migración completada.');
            return;
        }

        // Corregir cada cultivo
        for (const cultivo of cultivosMalformados) {
            console.log(`🔧 Corrigiendo cultivo: ${cultivo.nombre} (${cultivo._id})`);

            // Actualizar el campo notas a array vacío
            await Cultivo.updateOne(
                { _id: cultivo._id },
                {
                    $set: {
                        notas: [],
                        updatedAt: new Date()
                    }
                }
            );
        }

        console.log('✅ Migración completada exitosamente');
        console.log(`📈 ${cultivosMalformados.length} cultivos corregidos`);

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        throw error;
    } finally {
        // Cerrar conexión
        await mongoose.connection.close();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar la migración si se llama directamente
if (require.main === module) {
    fixCultivosNotas()
        .then(() => {
            console.log('🎉 Migración finalizada correctamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Error en la migración:', error);
            process.exit(1);
        });
}

module.exports = { fixCultivosNotas };
