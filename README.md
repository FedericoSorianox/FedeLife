# 🚀 FEDE LIFE - Sistema de Finanzas Personales

Sistema completo de finanzas personales con IA integrada, autenticación y análisis de PDFs.

## 🛠️ Tecnologías

- **Frontend**: HTML, CSS, JavaScript, Vite
- **Backend**: Node.js, Express, MongoDB
- **IA**: Google AI Studio (Gemini)
- **Autenticación**: JWT
- **Seguridad**: Helmet, Rate Limiting, CORS

## 🚀 Despliegue en Producción

### Opción 1: Render.com (RECOMENDADA)

1. **Crear cuenta en Render.com**
   - Ve a [render.com](https://render.com)
   - Regístrate con tu cuenta de GitHub

2. **Subir código a GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git push -u origin main
   ```

3. **Desplegar en Render**
   - En Render, haz clic en "New +"
   - Selecciona "Blueprint"
   - Conecta tu repositorio de GitHub
   - Render detectará automáticamente el `render.yaml`
   - Haz clic en "Apply"

4. **Configurar variables de entorno**
   - Ve a tu servicio en Render
   - En "Environment" agrega:
     - `GOOGLE_AI_API_KEY`: Tu API key de Google AI Studio
     - `JWT_SECRET`: Un string aleatorio seguro

5. **¡Listo!** Tu app estará en: `https://fedelife-finanzas.onrender.com`

### Opción 2: Vercel + MongoDB Atlas

1. **Base de datos**: Crear cuenta en MongoDB Atlas
2. **Frontend**: Desplegar en Vercel
3. **Backend**: Desplegar en Railway o Render

### Opción 3: Heroku

1. Crear cuenta en Heroku
2. Conectar repositorio
3. Configurar variables de entorno
4. Desplegar

## 🔧 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev          # Frontend
npm run server:dev   # Backend

# Build para producción
npm run build
```

## 📁 Estructura del Proyecto

```
/
├── pages/           # Páginas HTML
├── funciones/       # Funciones TypeScript
├── server/          # Backend Node.js
│   ├── routes/      # Rutas de la API
│   ├── models/      # Modelos de MongoDB
│   └── middleware/  # Middleware
├── dist/           # Build de producción
└── package.json
```

## 🔐 Variables de Entorno

Copia `env.example` a `.env` y configura:

```env
MONGODB_URI=mongodb://localhost:27017/fede-life-finanzas
JWT_SECRET=tu-jwt-secret-super-seguro
GOOGLE_AI_API_KEY=tu-api-key-de-google-ai
PORT=3000
NODE_ENV=development
```

## 🎯 Características

- ✅ Gestión de transacciones
- ✅ Categorización automática
- ✅ Análisis de PDFs con IA
- ✅ Reportes y gráficos
- ✅ Metas financieras
- ✅ Presupuestos
- ✅ Múltiples monedas
- ✅ Autenticación segura

## 📞 Soporte

Para dudas sobre el despliegue, consulta la documentación de Render o contacta al desarrollador.
# Fede-Life
