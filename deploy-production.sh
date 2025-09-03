#!/bin/bash

# 🚀 SCRIPT DE DESPLIEGUE PARA PRODUCCIÓN - FEDE LIFE
# Autor: Senior Backend Developer

echo "🚀 Iniciando despliegue a producción..."

# Verificar que estemos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No estás en el directorio raíz del proyecto"
    exit 1
fi

# Verificar que Git esté configurado
if ! git status > /dev/null 2>&1; then
    echo "❌ Error: No hay repositorio Git configurado"
    exit 1
fi

# Verificar que no haya cambios pendientes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️ Hay cambios pendientes en Git. ¿Quieres hacer commit antes del despliegue? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "📝 Haciendo commit de cambios..."
        git add .
        git commit -m "🚀 Despliegue a producción - $(date)"
    else
        echo "❌ Despliegue cancelado. Haz commit de tus cambios primero."
        exit 1
    fi
fi

# Verificar que estemos en la rama principal
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ] && [ "$current_branch" != "master" ]; then
    echo "⚠️ Estás en la rama '$current_branch'. ¿Quieres cambiar a main/master? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        if git show-ref --verify --quiet refs/remotes/origin/main; then
            git checkout main
        elif git show-ref --verify --quiet refs/remotes/origin/master; then
            git checkout master
        else
            echo "❌ No se encontró la rama principal"
            exit 1
        fi
    else
        echo "❌ Despliegue cancelado. Cambia a la rama principal primero."
        exit 1
    fi
fi

# Hacer pull de los últimos cambios
echo "📥 Actualizando repositorio local..."
git pull origin $(git branch --show-current)

# Verificar que el servidor simplificado existe
if [ ! -f "server/index-simple.js" ]; then
    echo "❌ Error: No se encontró server/index-simple.js"
    exit 1
fi

# Verificar que la configuración de producción existe
if [ ! -f "funciones/config-production-fixed.js" ]; then
    echo "❌ Error: No se encontró funciones/config-production-fixed.js"
    exit 1
fi

# Verificar que el frontend simplificado existe
if [ ! -f "funciones/finanzas-simple.js" ]; then
    echo "❌ Error: No se encontró funciones/finanzas-simple.js"
    exit 1
fi

echo "✅ Todos los archivos necesarios están presentes"

# Hacer push a producción
echo "🚀 Haciendo push a producción..."
git push origin $(git branch --show-current)

echo ""
echo "🎉 Despliegue completado exitosamente!"
echo ""
echo "📋 Resumen del despliegue:"
echo "   • Servidor: index-simple.js (con endpoints públicos)"
echo "   • Frontend: finanzas-simple.js (sin autenticación)"
echo "   • Configuración: config-production-fixed.js"
echo "   • Endpoints públicos disponibles:"
echo "     - POST /api/public/transactions/public"
echo "     - GET /api/public/categories/public"
echo "     - POST /api/public/ai/analyze-pdf"
echo ""
echo "🌐 Tu aplicación estará disponible en:"
echo "   https://fedelife-finanzas.onrender.com"
echo ""
echo "⚠️ Nota: El primer despliegue puede tomar varios minutos."
echo "   Puedes verificar el estado en el dashboard de Render."
