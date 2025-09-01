/**
 * 🔄 SCRIPT PARA CAMBIAR ENTRE DESARROLLO Y PRODUCCIÓN
 * 
 * Script para alternar fácilmente entre MongoDB local y Atlas
 * Autor: Senior Backend Developer
 */

const fs = require('fs');
const path = require('path');

const envFiles = {
    development: '.env.development',
    production: '.env'
};

function switchEnvironment(env) {
    console.log(`🔄 Cambiando a ambiente: ${env.toUpperCase()}`);
    console.log('='.repeat(50));
    
    if (!envFiles[env]) {
        console.error('❌ Ambiente no válido. Usa: development o production');
        process.exit(1);
    }
    
    const sourceFile = envFiles[env];
    const targetFile = '.env';
    
    if (!fs.existsSync(sourceFile)) {
        console.error(`❌ Archivo ${sourceFile} no existe`);
        console.log('💡 Archivos disponibles:');
        Object.keys(envFiles).forEach(key => {
            if (fs.existsSync(envFiles[key])) {
                console.log(`   ✅ ${envFiles[key]}`);
            } else {
                console.log(`   ❌ ${envFiles[key]} (no existe)`);
            }
        });
        process.exit(1);
    }
    
    try {
        // Copiar archivo
        fs.copyFileSync(sourceFile, targetFile);
        console.log(`✅ Copiado ${sourceFile} a ${targetFile}`);
        
        // Mostrar configuración actual
        const envContent = fs.readFileSync(targetFile, 'utf8');
        const mongoUri = envContent.match(/MONGODB_URI=(.+)/)?.[1] || 'No encontrada';
        const nodeEnv = envContent.match(/NODE_ENV=(.+)/)?.[1] || 'No encontrado';
        
        console.log('');
        console.log('📋 CONFIGURACIÓN ACTUAL:');
        console.log(`   Ambiente: ${nodeEnv}`);
        console.log(`   MongoDB: ${mongoUri.substring(0, 50)}...`);
        
        console.log('');
        console.log('🚀 PRÓXIMOS PASOS:');
        console.log('   1. Reinicia el servidor: npm run server:dev (desarrollo) o npm run server:prod (producción)');
        console.log('   2. Prueba la conexión: npm run test:connection');
        console.log('   3. Prueba la API: npm run test:db');
        
    } catch (error) {
        console.error('❌ Error cambiando ambiente:', error.message);
        process.exit(1);
    }
}

// Obtener argumento de línea de comandos
const env = process.argv[2];

if (!env) {
    console.log('🔄 SCRIPT DE CAMBIO DE AMBIENTE - FEDE LIFE');
    console.log('='.repeat(50));
    console.log('');
    console.log('Uso: node switch-env.js [development|production]');
    console.log('');
    console.log('Ejemplos:');
    console.log('   node switch-env.js development  # Cambiar a MongoDB local');
    console.log('   node switch-env.js production   # Cambiar a MongoDB Atlas');
    console.log('');
    console.log('Archivos disponibles:');
    Object.keys(envFiles).forEach(key => {
        if (fs.existsSync(envFiles[key])) {
            console.log(`   ✅ ${envFiles[key]}`);
        } else {
            console.log(`   ❌ ${envFiles[key]} (no existe)`);
        }
    });
    process.exit(0);
}

switchEnvironment(env);
