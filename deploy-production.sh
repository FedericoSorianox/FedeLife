#!/bin/bash

# 🚀 SCRIPT DE DESPLIEGUE - PRODUCCIÓN
#
# Despliega la aplicación en Render con verificaciones previas
# Autor: Senior Backend Developer

echo "🚀 Iniciando despliegue a producción..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Ejecutar desde el directorio raíz del proyecto"
    exit 1
fi

# Verificar que las dependencias estén instaladas
echo "📦 Verificando dependencias..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  Instalando dependencias..."
    npm install
fi

# Verificar que el build sea exitoso
echo "🔨 Construyendo aplicación..."
if npm run build; then
    echo "✅ Build exitoso"
else
    echo "❌ Error en el build"
    exit 1
fi

# Verificar conexión a MongoDB
echo "🗄️  Verificando conexión a MongoDB..."
if node test-mongodb-connection.js; then
    echo "✅ Conexión a MongoDB OK"
else
    echo "❌ Error de conexión a MongoDB"
    echo "🔧 Verificar credenciales y configuración de MongoDB Atlas"
    exit 1
fi

# Verificar que el servidor local funcione
echo "🖥️  Verificando servidor local..."
npm start &
SERVER_PID=$!
sleep 5

if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Servidor local OK"
    kill $SERVER_PID
else
    echo "❌ Error en servidor local"
    kill $SERVER_PID
    exit 1
fi

# Commit de cambios si es necesario
echo "📝 Verificando cambios pendientes..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Hay cambios sin commit"
    echo "📋 Cambios detectados:"
    git status --short

    read -p "¿Quieres hacer commit de los cambios? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "Deploy: $(date +'%Y-%m-%d %H:%M:%S')"
        git push origin main
        echo "✅ Cambios commited y pusheados"
    fi
else
    echo "✅ No hay cambios pendientes"
fi

echo ""
echo "🎯 DESPLIEGUE COMPLETADO"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Verificar que Render haya detectado el push automático"
echo "   2. Monitorear el build en el dashboard de Render"
echo "   3. Una vez desplegado, ejecutar: node monitor-production.js"
echo "   4. Verificar que todos los endpoints respondan correctamente"
echo ""
echo "🔗 URLs importantes:"
echo "   • Dashboard Render: https://dashboard.render.com"
echo "   • App desplegada: https://fedelife-finanzas.onrender.com"
echo "   • Health check: https://fedelife-finanzas.onrender.com/api/health"
echo ""
echo "📞 Si hay problemas:"
echo "   • Revisar logs en Render dashboard"
echo "   • Ejecutar: node monitor-production.js"
echo "   • Verificar configuración de MongoDB Atlas"