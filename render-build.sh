#!/bin/bash

# Script de build personalizado para Render
echo "🚀 Iniciando build personalizado para Render..."

# Instalar dependencias (incluyendo devDependencies necesarias para build)
echo "📦 Instalando dependencias completas..."
npm ci

# Verificar dependencias críticas necesarias para el build
echo "🔧 Verificando dependencias críticas..."
echo "📋 Verificando critters..."
npm list critters || npm install critters --save-dev

echo "📋 Verificando autoprefixer..."
npm list autoprefixer || npm install autoprefixer --save-dev

echo "📋 Verificando postcss..."
npm list postcss || npm install postcss --save-dev

echo "📋 Verificando tailwindcss..."
npm list tailwindcss || npm install tailwindcss --save-dev

echo "📋 Verificando typescript..."
npm list typescript || npm install typescript --save-dev

# Hacer build de Next.js
echo "🏗️ Construyendo aplicación Next.js..."
npm run build

# Verificar que el build se creó correctamente
if [ ! -d ".next" ]; then
    echo "❌ Error: Directorio .next no encontrado después del build"
    exit 1
fi

if [ ! -f ".next/BUILD_ID" ]; then
    echo "❌ Error: BUILD_ID no encontrado en .next"
    exit 1
fi

echo "✅ Build completado exitosamente"
echo "📁 Contenido de .next:"
ls -la .next/ | head -10
