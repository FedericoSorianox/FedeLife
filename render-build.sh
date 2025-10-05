#!/bin/bash

# Script de build personalizado para Render
echo "🚀 Iniciando build personalizado para Render..."

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm ci --production

# Verificar que critters esté instalado (necesario para Next.js)
echo "🔧 Verificando dependencias críticas..."
npm list critters || npm install critters --save-dev

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
