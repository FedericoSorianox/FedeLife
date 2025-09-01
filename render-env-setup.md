# 🔧 CONFIGURACIÓN DE VARIABLES DE ENTORNO EN RENDER.COM

## ❌ **PROBLEMA IDENTIFICADO**

El error en Render.com indica que la variable `MONGODB_URI` no tiene el formato correcto:
```
MongoParseError: Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"
```

## ✅ **SOLUCIÓN**

### **1. Ir a tu proyecto en Render.com**
- Ve a tu dashboard de Render.com
- Selecciona tu proyecto `fede-life-finanzas`
- Ve a la pestaña "Environment"

### **2. Configurar las siguientes variables de entorno:**

```env
# ==================== PRODUCCIÓN - MONGODB ATLAS ====================
MONGODB_URI=mongodb+srv://fededanguard_db_user:CbBwcPzT5UatJlkT@cluster0.ew9wkss.mongodb.net/fede-life-finanzas?retryWrites=true&w=majority&appName=Cluster0

# ==================== CONFIGURACIÓN DE AUTENTICACIÓN ====================
JWT_SECRET=fede-life-super-secret-key-2024-production
JWT_EXPIRES_IN=7d

# ==================== CONFIGURACIÓN DEL SERVIDOR ====================
PORT=10000
NODE_ENV=production

# ==================== CONFIGURACIÓN DE SEGURIDAD ====================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# ==================== CONFIGURACIÓN DE LOGS ====================
LOG_LEVEL=error

# ==================== CONFIGURACIÓN DE IA ====================
GOOGLE_AI_API_KEY=tu-api-key-de-google-ai-studio

# ==================== CONFIGURACIÓN DE PRODUCCIÓN ====================
FRONTEND_URL=https://fedelife-finanzas.onrender.com
```

### **3. Pasos específicos en Render.com:**

1. **Ir a Environment Variables**
   - En tu proyecto, ve a "Environment" → "Environment Variables"

2. **Agregar cada variable:**
   - Click en "Add Environment Variable"
   - **Key**: `MONGODB_URI`
   - **Value**: `mongodb+srv://fededanguard_db_user:CbBwcPzT5UatJlkT@cluster0.ew9wkss.mongodb.net/fede-life-finanzas?retryWrites=true&w=majority&appName=Cluster0`

3. **Repetir para todas las variables:**
   - `JWT_SECRET` = `fede-life-super-secret-key-2024-production`
   - `PORT` = `10000`
   - `NODE_ENV` = `production`
   - `RATE_LIMIT_WINDOW_MS` = `900000`
   - `RATE_LIMIT_MAX_REQUESTS` = `50`
   - `LOG_LEVEL` = `error`
   - `GOOGLE_AI_API_KEY` = `tu-api-key-de-google-ai-studio`
   - `FRONTEND_URL` = `https://fedelife-finanzas.onrender.com`

### **4. Después de configurar:**
- Click en "Save Changes"
- Ve a "Manual Deploy" → "Deploy latest commit"
- O espera a que se despliegue automáticamente

---

## 🔍 **VERIFICACIÓN**

### **Logs esperados después del despliegue:**
```
✅ Conectado a MongoDB exitosamente
📊 Base de datos: fede-life-finanzas
🔗 Host: ac-ohqfigs-shard-00-XX.ew9wkss.mongodb.net
🚪 Puerto: 27017
✅ Servidor corriendo en puerto 10000
🌍 Ambiente: production
```

### **URL de la aplicación:**
- **Frontend**: https://fedelife-finanzas.onrender.com
- **API**: https://fedelife-finanzas.onrender.com/api/health

---

## 🚨 **IMPORTANTE**

- **NO** subas el archivo `.env` al repositorio
- Las variables de entorno en Render.com son **seguras** y **privadas**
- El puerto en Render.com debe ser `10000` (no 3000)
- La URL de MongoDB Atlas debe comenzar con `mongodb+srv://`

---

**Autor:** Senior Full Stack Developer  
**Fecha:** Septiembre 2024  
**Estado:** ⚠️ **CONFIGURACIÓN REQUERIDA EN RENDER.COM**
