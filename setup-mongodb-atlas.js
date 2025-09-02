/**
 * 🗄️ SCRIPT DE CONFIGURACIÓN MONGODB ATLAS
 * 
 * Script interactivo para configurar MongoDB Atlas para producción
 * Autor: Senior Backend Developer
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Función para hacer preguntas al usuario
 */
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

/**
 * Función para generar contraseña segura
 */
function generateSecurePassword(length = 32) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

/**
 * Función para generar JWT secret seguro
 */
function generateJWTSecret(length = 64) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let secret = '';
    for (let i = 0; i < length; i++) {
        secret += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return secret;
}

/**
 * Función principal
 */
async function setupMongoDBAtlas() {
    console.log('🗄️ CONFIGURACIÓN DE MONGODB ATLAS PARA PRODUCCIÓN');
    console.log('='.repeat(60));
    console.log('');
    
    console.log('📋 PASOS A SEGUIR:');
    console.log('1. Ve a https://www.mongodb.com/atlas');
    console.log('2. Crea una cuenta gratuita');
    console.log('3. Crea un cluster gratuito');
    console.log('4. Configura la seguridad');
    console.log('5. Obtén la connection string');
    console.log('');
    
    // Preguntar si ya tiene cuenta
    const hasAccount = await question('¿Ya tienes una cuenta en MongoDB Atlas? (s/n): ');
    
    if (hasAccount.toLowerCase() !== 's' && hasAccount.toLowerCase() !== 'si') {
        console.log('');
        console.log('🔗 CREAR CUENTA EN MONGODB ATLAS:');
        console.log('1. Ve a: https://www.mongodb.com/atlas');
        console.log('2. Haz clic en "Try Free"');
        console.log('3. Completa el registro con tu email');
        console.log('4. Verifica tu email');
        console.log('');
        
        await question('Presiona ENTER cuando hayas creado la cuenta...');
    }
    
    console.log('');
    console.log('🏗️ CONFIGURAR CLUSTER:');
    console.log('1. Selecciona "Build a Database"');
    console.log('2. Elige "FREE" tier (M0)');
    console.log('3. Selecciona tu proveedor preferido (AWS, Google Cloud, Azure)');
    console.log('4. Elige la región más cercana a tus usuarios');
    console.log('5. Haz clic en "Create"');
    console.log('');
    
    await question('Presiona ENTER cuando hayas creado el cluster...');
    
    console.log('');
    console.log('🔐 CONFIGURAR SEGURIDAD:');
    console.log('1. En "Security Quickstart"');
    console.log('2. Crea un usuario de base de datos:');
    
    const dbUsername = await question('   Usuario (ej: fede-life-admin): ') || 'fede-life-admin';
    const useGeneratedPassword = await question('   ¿Quieres generar una contraseña segura? (s/n): ');
    
    let dbPassword;
    if (useGeneratedPassword.toLowerCase() === 's' || useGeneratedPassword.toLowerCase() === 'si') {
        dbPassword = generateSecurePassword();
        console.log(`   Contraseña generada: ${dbPassword}`);
        console.log('   ⚠️  GUARDA ESTA CONTRASEÑA EN UN LUGAR SEGURO');
    } else {
        dbPassword = await question('   Ingresa tu contraseña: ');
    }
    
    console.log('');
    console.log('3. En "Where would you like to connect from?"');
    console.log('   - Para desarrollo: selecciona "My Local Environment"');
    console.log('   - Para producción: selecciona "Cloud Environment"');
    console.log('   - O agrega tu IP específica');
    console.log('');
    
    await question('Presiona ENTER cuando hayas configurado la seguridad...');
    
    console.log('');
    console.log('🔗 OBTENER CONNECTION STRING:');
    console.log('1. Haz clic en "Connect" en tu cluster');
    console.log('2. Selecciona "Connect your application"');
    console.log('3. Copia la connection string');
    console.log('');
    
    const connectionString = await question('Pega la connection string aquí: ');
    
    if (!connectionString || !connectionString.includes('mongodb+srv://')) {
        console.log('❌ Connection string inválida. Debe comenzar con "mongodb+srv://"');
        rl.close();
        return;
    }
    
    // Reemplazar <password> con la contraseña real
    const finalConnectionString = connectionString.replace('<password>', dbPassword);
    
    console.log('');
    console.log('🔧 GENERANDO ARCHIVO .env...');
    
    // Generar JWT secret
    const jwtSecret = generateJWTSecret();
    
    // Crear contenido del archivo .env
    const envContent = `# ==================== PRODUCCIÓN - MONGODB ATLAS ====================
MONGODB_URI=${finalConnectionString}

# ==================== CONFIGURACIÓN DE AUTENTICACIÓN ====================
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=7d

# ==================== CONFIGURACIÓN DEL SERVIDOR ====================
PORT=3000
NODE_ENV=production

# ==================== CONFIGURACIÓN DE SEGURIDAD ====================
# Rate limiting más estricto en producción
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# ==================== CONFIGURACIÓN DE LOGS ====================
LOG_LEVEL=error

# ==================== CONFIGURACIÓN DE IA ====================
GOOGLE_AI_API_KEY=tu-api-key-de-google-ai-studio

# ==================== CONFIGURACIÓN DE PRODUCCIÓN ====================
FRONTEND_URL=https://tu-dominio.com
`;
    
    // Escribir archivo .env
    try {
        fs.writeFileSync('.env', envContent);
        console.log('✅ Archivo .env creado exitosamente');
    } catch (error) {
        console.error('❌ Error creando archivo .env:', error.message);
        rl.close();
        return;
    }
    
    console.log('');
    console.log('📋 RESUMEN DE CONFIGURACIÓN:');
    console.log('='.repeat(40));
    console.log(`👤 Usuario DB: ${dbUsername}`);
    console.log(`🔑 Contraseña DB: ${dbPassword}`);
    console.log(`🔗 Connection String: ${finalConnectionString.substring(0, 50)}...`);
    console.log(`🔐 JWT Secret: ${jwtSecret.substring(0, 20)}...`);
    console.log('');
    
    console.log('⚠️  INFORMACIÓN IMPORTANTE:');
    console.log('- Guarda la contraseña de la base de datos en un lugar seguro');
    console.log('- El JWT secret se generó automáticamente');
    console.log('- El archivo .env contiene información sensible, no lo subas a Git');
    console.log('');
    
    console.log('🚀 PRÓXIMOS PASOS:');
    console.log('1. Agrega .env a tu .gitignore');
    console.log('2. Configura las variables de entorno en tu plataforma de hosting');
    console.log('3. Prueba la conexión con: npm run test:db');
    console.log('4. Despliega tu aplicación');
    console.log('');
    
    // Crear .gitignore si no existe
    const gitignorePath = '.gitignore';
    if (!fs.existsSync(gitignorePath)) {
        const gitignoreContent = `# Environment variables
.env
.env.local
.env.production

# Dependencies
node_modules/

# Logs
logs
*.log
npm-debug.log*

# Runtime data
pids
*.pid
*.seed

# Coverage directory used by tools like istanbul
coverage/

# Build outputs
dist/
build/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
`;
        
        fs.writeFileSync(gitignorePath, gitignoreContent);
        console.log('✅ Archivo .gitignore creado');
    }
    
    console.log('🎉 ¡Configuración completada!');
    rl.close();
}

// Ejecutar script
setupMongoDBAtlas().catch(console.error);
