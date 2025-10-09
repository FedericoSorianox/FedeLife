// scripts/diagnose-network.js
// Script de diagnóstico para problemas de conexión de red
// Ayuda a identificar y solucionar errores como ETIMEDOUT

const { NetworkErrorHandler } = require('../lib/utils');

/**
 * Función principal para ejecutar diagnóstico de red
 */
async function diagnoseNetwork() {
  console.log('🔍 Iniciando diagnóstico de conexión de red...\n');

  // 1. Verificar conectividad básica
  await checkBasicConnectivity();

  // 2. Probar servicios específicos del proyecto
  await checkProjectServices();

  // 3. Verificar configuración de entorno
  await checkEnvironmentConfig();

  // 4. Probar manejo de errores mejorado
  await testErrorHandling();

  console.log('\n✅ Diagnóstico completado');
  console.log('📋 Revisa los resultados anteriores para identificar problemas');
}

/**
 * Verificar conectividad básica a internet
 */
async function checkBasicConnectivity() {
  console.log('🌐 Verificando conectividad básica...');

  try {
    await NetworkErrorHandler.withRetry(
      async () => {
        const response = await fetch('https://www.google.com/generate_204', {
          method: 'HEAD',
          timeout: 5000
        });

        if (response.ok) {
          console.log('✅ Conectividad básica: OK');
        } else {
          console.log(`⚠️ Respuesta HTTP ${response.status} de google.com`);
        }
      },
      {
        timeout: 5000,
        maxRetries: 2,
        context: 'Basic connectivity test'
      }
    );
  } catch (error) {
    console.log(`❌ Error de conectividad básica: ${error.message}`);
  }
}

/**
 * Probar servicios específicos del proyecto
 */
async function checkProjectServices() {
  console.log('\n🔧 Probando servicios del proyecto...');

  // Lista de servicios a probar
  const services = [
    {
      name: 'MongoDB Atlas',
      url: process.env.MONGODB_URI || 'mongodb+srv://...',
      test: async (url) => {
        if (!url || url.includes('...')) {
          throw new Error('MONGODB_URI no configurado');
        }

        // Solo verificar que la URL tenga formato válido
        if (url.startsWith('mongodb+srv://') || url.startsWith('mongodb://')) {
          return 'URL válida';
        }
        throw new Error('Formato de URL inválido');
      }
    },
    {
      name: 'API Backend',
      url: 'http://localhost:3003/api/health',
      test: async (url) => {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok ? 'Servicio activo' : `Error HTTP ${response.status}`;
      }
    },
    {
      name: 'OpenAI API',
      url: 'https://api.openai.com/v1/models',
      test: async (url) => {
        const response = await fetch(url, {
          method: 'HEAD',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY || 'sk-...'}`,
          }
        });

        if (response.status === 401) {
          return 'API configurada (requiere autenticación)';
        }
        if (response.ok) {
          return 'API accesible';
        }
        throw new Error(`HTTP ${response.status}`);
      }
    }
  ];

  for (const service of services) {
    try {
      const result = await NetworkErrorHandler.withRetry(
        () => service.test(service.url),
        {
          timeout: 10000,
          maxRetries: 1,
          context: `Service test: ${service.name}`
        }
      );

      console.log(`✅ ${service.name}: ${result}`);
    } catch (error) {
      console.log(`❌ ${service.name}: ${error.message}`);
    }
  }
}

/**
 * Verificar configuración de entorno
 */
async function checkEnvironmentConfig() {
  console.log('\n⚙️ Verificando configuración de entorno...');

  const configs = [
    { name: 'NODE_ENV', value: process.env.NODE_ENV, expected: ['development', 'production'] },
    { name: 'MONGODB_URI', value: process.env.MONGODB_URI ? 'Configurada' : 'No configurada' },
    { name: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY ? 'Configurada' : 'No configurada' },
    { name: 'NEXTAUTH_URL', value: process.env.NEXTAUTH_URL || 'No configurada' },
    { name: 'NEXTAUTH_SECRET', value: process.env.NEXTAUTH_SECRET ? 'Configurada' : 'No configurada' }
  ];

  configs.forEach(config => {
    let status = '✅';

    if (config.expected && !config.expected.includes(config.value)) {
      status = '⚠️';
    } else if (config.value === 'No configurada') {
      status = '❌';
    }

    console.log(`${status} ${config.name}: ${config.value}`);
  });
}

/**
 * Probar el manejo de errores mejorado
 */
async function testErrorHandling() {
  console.log('\n🛠️ Probando manejo de errores mejorado...');

  // Simular diferentes tipos de errores de red
  const errorTests = [
    {
      name: 'Timeout simulado',
      test: () => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('ETIMEDOUT: Connection timeout')), 100);
      })
    },
    {
      name: 'Error de conexión simulado',
      test: () => {
        throw new Error('ECONNREFUSED: Connection refused');
      }
    }
  ];

  for (const errorTest of errorTests) {
    try {
      await NetworkErrorHandler.withRetry(
        errorTest.test,
        {
          timeout: 1000,
          maxRetries: 2,
          retryDelay: 100,
          context: `Error test: ${errorTest.name}`
        }
      );

      console.log(`✅ ${errorTest.name}: Manejado correctamente`);
    } catch (error) {
      console.log(`✅ ${errorTest.name}: Error capturado - ${error.message}`);
    }
  }
}

/**
 * Función para limpiar caché de DNS (útil para problemas de resolución)
 */
async function flushDNSCache() {
  console.log('\n🔄 Intentando limpiar caché de DNS...');

  try {
    // En sistemas Unix/Linux
    if (process.platform !== 'win32') {
      const { exec } = require('child_process');
      exec('sudo systemd-resolve --flush-caches || sudo service dnsmasq restart || echo "No se pudo limpiar DNS"', (error) => {
        if (error) {
          console.log('⚠️ No se pudo limpiar caché de DNS automáticamente');
        } else {
          console.log('✅ Caché de DNS limpiado');
        }
      });
    } else {
      console.log('ℹ️ En Windows, ejecuta: ipconfig /flushdns');
    }
  } catch (error) {
    console.log('⚠️ Error limpiando caché de DNS:', error.message);
  }
}

// Ejecutar diagnóstico si se ejecuta directamente
if (require.main === module) {
  diagnoseNetwork()
    .then(() => {
      console.log('\n🎯 Diagnóstico finalizado. Usa estos resultados para solucionar problemas de conexión.');
    })
    .catch((error) => {
      console.error('\n💥 Error durante el diagnóstico:', error);
    });
}

module.exports = {
  diagnoseNetwork,
  checkBasicConnectivity,
  checkProjectServices,
  checkEnvironmentConfig,
  testErrorHandling,
  flushDNSCache
};
