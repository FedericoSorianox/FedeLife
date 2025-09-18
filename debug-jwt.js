#!/usr/bin/env node

/**
 * 🔧 DEBUG JWT - Script para diagnosticar problemas de autenticación JWT
 *
 * Uso: node debug-jwt.js
 *
 * Este script verifica:
 * - Configuración de JWT en el servidor
 * - Generación y verificación de tokens
 * - Comparación entre entornos
 */

const jwt = require('jsonwebtoken');

// Configuración JWT
const JWT_SECRET = process.env.JWT_SECRET || 'fede-life-secret-key';
const JWT_NO_EXPIRE = process.env.JWT_NO_EXPIRE === 'true';

console.log('🔧 DEBUG JWT - Diagnóstico de problemas de autenticación\n');

// 1. Verificar configuración
console.log('📋 1. CONFIGURACIÓN JWT:');
console.log('   JWT_SECRET configurado:', !!process.env.JWT_SECRET);
console.log('   JWT_SECRET longitud:', JWT_SECRET.length);
console.log('   JWT_NO_EXPIRE:', JWT_NO_EXPIRE);
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
console.log();

// 2. Generar token de prueba
console.log('🔑 2. GENERANDO TOKEN DE PRUEBA:');
const testPayload = {
    id: '507f1f77bcf86cd799439011',
    username: 'test_user',
    email: 'test@fedelife.com',
    firstName: 'Test',
    lastName: 'User'
};

const options = JWT_NO_EXPIRE ? { noTimestamp: true } : { expiresIn: '7d' };

try {
    const testToken = jwt.sign(testPayload, JWT_SECRET, options);
    console.log('   ✅ Token generado correctamente');
    console.log('   📄 Token (primeros 50 chars):', testToken.substring(0, 50) + '...');
    console.log('   📏 Longitud del token:', testToken.length);

    // 3. Verificar token generado
    console.log('\n🔍 3. VERIFICANDO TOKEN GENERADO:');
    const decoded = jwt.verify(testToken, JWT_SECRET);
    console.log('   ✅ Token verificado correctamente');
    console.log('   👤 Usuario decodificado:', decoded.username);
    console.log('   🆔 ID:', decoded.id);

    // 4. Probar con token inválido
    console.log('\n❌ 4. PROBANDO CON TOKEN INVÁLIDO:');
    const invalidToken = testToken + 'invalid';
    try {
        jwt.verify(invalidToken, JWT_SECRET);
        console.log('   ❌ ERROR: Token inválido fue aceptado');
    } catch (error) {
        console.log('   ✅ Token inválido correctamente rechazado:', error.message);
    }

    // 5. Probar con clave secreta diferente
    console.log('\n🔐 5. PROBANDO CON CLAVE DIFERENTE:');
    const wrongSecret = 'wrong-secret-key';
    try {
        jwt.verify(testToken, wrongSecret);
        console.log('   ❌ ERROR: Token con clave diferente fue aceptado');
    } catch (error) {
        console.log('   ✅ Token con clave diferente correctamente rechazado');
        console.log('   📝 Error esperado:', error.message);
    }

    console.log('\n✅ DIAGNÓSTICO COMPLETADO');
    console.log('📊 RESUMEN:');
    console.log('   - Configuración JWT: OK');
    console.log('   - Generación de tokens: OK');
    console.log('   - Verificación de tokens: OK');
    console.log('   - Rechazo de tokens inválidos: OK');

    console.log('\n💡 RECOMENDACIONES:');
    if (!process.env.JWT_SECRET) {
        console.log('   ⚠️  Configura JWT_SECRET en variables de entorno para producción');
    }
    if (JWT_NO_EXPIRE) {
        console.log('   ⚠️  JWT_NO_EXPIRE está activado (solo para desarrollo)');
    }

} catch (error) {
    console.log('\n❌ ERROR EN DIAGNÓSTICO:');
    console.log('   Error:', error.message);
    console.log('   Stack:', error.stack);
}

console.log('\n🎯 PRÓXIMOS PASOS:');
console.log('   1. Si estás en producción, configura JWT_SECRET');
console.log('   2. Limpia tokens antiguos del navegador');
console.log('   3. Haz un nuevo login');
console.log('   4. Verifica que las categorías se crean correctamente');
