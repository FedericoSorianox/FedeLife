#!/bin/bash

set -e  # Salir si cualquier comando falla

# Script de build personalizado para Render
echo "🚀 Iniciando build personalizado para Render..."

# Verificar Node.js y npm
echo "📋 Verificando versiones..."
node --version
npm --version

# Limpiar cache de npm si existe
echo "🧹 Limpiando cache de npm..."
npm cache clean --force 2>/dev/null || true

# Instalar dependencias con más opciones
echo "📦 Instalando dependencias completas..."
npm ci --verbose

# Verificar que las dependencias críticas estén instaladas
echo "🔧 Verificando dependencias críticas..."

check_dependency() {
    local dep=$1
    echo "📋 Verificando $dep..."
    if npm list $dep >/dev/null 2>&1; then
        echo "✅ $dep OK"
    else
        echo "⚠️  $dep no encontrado, instalando..."
        npm install $dep --save-dev
        if npm list $dep >/dev/null 2>&1; then
            echo "✅ $dep instalado correctamente"
        else
            echo "❌ Error: No se pudo instalar $dep"
            exit 1
        fi
    fi
}

# Verificar dependencias críticas una por una
check_dependency "critters"
check_dependency "autoprefixer"
check_dependency "postcss"
check_dependency "tailwindcss"
check_dependency "typescript"

# Verificar que el package.json existe y es válido
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json no encontrado"
    exit 1
fi

# Verificar que node_modules existe
if [ ! -d "node_modules" ]; then
    echo "❌ Error: node_modules no encontrado después de npm ci"
    exit 1
fi

echo "📋 Verificando scripts de package.json..."
npm run --silent 2>/dev/null || echo "⚠️ npm run no disponible, pero continuando..."

# Hacer build de Next.js con más información
echo "🏗️ Construyendo aplicación Next.js..."
echo "📋 Ejecutando: npm run build"
npm run build

# Verificar que el build se creó correctamente
echo "🔍 Verificando build..."

if [ ! -d ".next" ]; then
    echo "❌ Error: Directorio .next no encontrado después del build"
    echo "📁 Contenido del directorio actual:"
    ls -la
    exit 1
fi

if [ ! -f ".next/BUILD_ID" ]; then
    echo "❌ Error: BUILD_ID no encontrado en .next"
    echo "📁 Contenido de .next:"
    ls -la .next/ 2>/dev/null || echo "No se puede listar .next"
    exit 1
fi

echo "✅ Build completado exitosamente"
echo "📁 Contenido de .next:"
ls -la .next/ | head -10

# Verificar que el BUILD_ID tiene contenido
BUILD_ID=$(cat .next/BUILD_ID 2>/dev/null || echo "")
if [ -z "$BUILD_ID" ]; then
    echo "❌ Error: BUILD_ID está vacío"
    exit 1
else
    echo "✅ BUILD_ID válido: $BUILD_ID"
fi

echo "🎉 Build completado exitosamente - listo para producción!"
