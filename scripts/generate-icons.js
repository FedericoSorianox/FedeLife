/**
 * Generador de iconos PWA
 * Convierte SVG base a múltiples tamaños PNG
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
const outputDir = path.join(__dirname, '..', 'public', 'icons');

async function generateIcons() {
  console.log('🎨 Generando iconos PWA...');

  // Verificar que el SVG existe
  if (!fs.existsSync(inputSvg)) {
    console.error('❌ No se encuentra el archivo SVG base:', inputSvg);
    return;
  }

  // Crear directorio de salida si no existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Leer el SVG
  const svgBuffer = fs.readFileSync(inputSvg);

  // Generar cada tamaño
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png({
          quality: 90,
          compressionLevel: 9,
        })
        .toFile(outputPath);

      console.log(`✅ Generado: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Error generando icon-${size}x${size}.png:`, error.message);
    }
  }

  // También crear versiones maskable (con padding)
  console.log('🎭 Generando iconos maskable...');
  const maskableSizes = [192, 512];

  for (const size of maskableSizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}-maskable.png`);
    const padding = Math.floor(size * 0.1); // 10% padding
    const iconSize = size - (padding * 2);

    try {
      // Crear un canvas con padding transparente
      const maskableSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" fill="none">
          <rect width="${size}" height="${size}" fill="transparent"/>
          <g transform="translate(${padding}, ${padding})">
            <svg viewBox="0 0 512 512" width="${iconSize}" height="${iconSize}">
              <!-- Background -->
              <rect width="512" height="512" rx="128" fill="#2563eb"/>
              <!-- Money symbol -->
              <g transform="translate(256, 256)">
                <circle cx="0" cy="0" r="200" fill="#ffffff" opacity="0.1"/>
                <text x="0" y="0" font-family="Arial, sans-serif" font-size="280" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">$</text>
                <circle cx="0" cy="0" r="120" fill="none" stroke="#ffffff" stroke-width="8" opacity="0.3"/>
              </g>
              <!-- Corner decorations -->
              <g opacity="0.2">
                <rect x="40" y="40" width="60" height="8" rx="4" fill="#ffffff"/>
                <rect x="40" y="56" width="40" height="8" rx="4" fill="#ffffff"/>
                <rect x="40" y="72" width="50" height="8" rx="4" fill="#ffffff"/>
                <rect x="412" y="40" width="60" height="8" rx="4" fill="#ffffff"/>
                <rect x="432" y="56" width="40" height="8" rx="4" fill="#ffffff"/>
                <rect x="422" y="72" width="50" height="8" rx="4" fill="#ffffff"/>
                <rect x="40" y="400" width="60" height="8" rx="4" fill="#ffffff"/>
                <rect x="40" y="416" width="40" height="8" rx="4" fill="#ffffff"/>
                <rect x="40" y="432" width="50" height="8" rx="4" fill="#ffffff"/>
                <rect x="412" y="400" width="60" height="8" rx="4" fill="#ffffff"/>
                <rect x="432" y="416" width="40" height="8" rx="4" fill="#ffffff"/>
                <rect x="422" y="432" width="50" height="8" rx="4" fill="#ffffff"/>
              </g>
            </svg>
          </g>
        </svg>
      `;

      await sharp(Buffer.from(maskableSvg))
        .png({
          quality: 90,
          compressionLevel: 9,
        })
        .toFile(outputPath);

      console.log(`✅ Generado: icon-${size}x${size}-maskable.png`);
    } catch (error) {
      console.error(`❌ Error generando icon-${size}x${size}-maskable.png:`, error.message);
    }
  }

  console.log('🎉 ¡Todos los iconos generados exitosamente!');
  console.log(`📁 Iconos guardados en: ${outputDir}`);
}

generateIcons().catch(console.error);
