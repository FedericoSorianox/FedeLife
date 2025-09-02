# 🔐 API FEDE LIFE - DOCUMENTACIÓN COMPLETA

## 📋 Índice
1. [Configuración Inicial](#configuración-inicial)
2. [Endpoints de Autenticación](#endpoints-de-autenticación)
3. [Manejo de Errores](#manejo-de-errores)
4. [Ejemplos de Uso](#ejemplos-de-uso)
5. [Solución de Problemas](#solución-de-problemas)

---

## 🚀 CONFIGURACIÓN INICIAL

### 1. Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto:

```env
# Base de datos
MONGODB_URI=mongodb://localhost:27017/fede-life-finanzas

# Autenticación
JWT_SECRET=tu-jwt-secret-super-seguro-aqui
JWT_EXPIRES_IN=7d

# Servidor
PORT=3000
NODE_ENV=development
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Iniciar MongoDB
```bash
# En macOS con Homebrew
brew services start mongodb-community

# Verificar que esté corriendo
brew services list | grep mongo
```

### 4. Iniciar Servidor
```bash
cd server
node index.js
```

---

## 🔐 ENDPOINTS DE AUTENTICACIÓN

### Base URL
```
http://localhost:3000/api
```

### 1. Health Check
**GET** `/health`
```bash
curl http://localhost:3000/api/health
```

### 2. Registro de Usuario
**POST** `/auth/register`

**Body:**
```json
{
  "username": "usuario",
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "firstName": "Nombre",
  "lastName": "Apellido"
}
```

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "usuario",
    "email": "usuario@ejemplo.com",
    "password": "contraseña123",
    "firstName": "Nombre",
    "lastName": "Apellido"
  }'
```

### 3. Login
**POST** `/auth/login`

**Body:**
```json
{
  "identifier": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Ejemplo:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "usuario@ejemplo.com",
    "password": "contraseña123"
  }'
```

**Nota:** El campo `identifier` puede ser email o username.

### 4. Obtener Perfil
**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Ejemplo:**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🚨 MANEJO DE ERRORES

### Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Operación exitosa |
| 201 | Created - Recurso creado |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Credenciales inválidas |
| 403 | Forbidden - Acceso denegado |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Recurso ya existe |
| 500 | Internal Server Error - Error del servidor |
| 503 | Service Unavailable - Servicio no disponible |

### Estructura de Error
```json
{
  "error": "Tipo de error",
  "message": "Descripción detallada del error",
  "details": ["Lista de errores específicos"]
}
```

### Errores Comunes

#### 1. Error 500 - Error Interno del Servidor
**Causa:** MongoDB no está conectado o hay un error en el servidor.

**Solución:**
```bash
# Verificar que MongoDB esté corriendo
brew services list | grep mongo

# Si no está corriendo, iniciarlo
brew services start mongodb-community

# Verificar variables de entorno
cat .env
```

#### 2. Error 400 - Datos Inválidos
**Causa:** JSON malformado o campos faltantes.

**Solución:** Asegúrate de que el JSON sea válido:
```json
{
  "identifier": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

#### 3. Error 401 - Credenciales Inválidas
**Causa:** Usuario no existe o contraseña incorrecta.

**Solución:** Verifica las credenciales o registra un nuevo usuario.

---

## 💡 EJEMPLOS DE USO

### 1. Flujo Completo de Autenticación

```bash
# 1. Registrar usuario
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@ejemplo.com",
    "password": "test123456",
    "firstName": "Test",
    "lastName": "User"
  }'

# 2. Hacer login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "test@ejemplo.com",
    "password": "test123456"
  }'

# 3. Obtener perfil (usar token del paso anterior)
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token-aqui>"
```

### 2. Usando JavaScript/Fetch

```javascript
// Login
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    identifier: 'usuario@ejemplo.com',
    password: 'contraseña123'
  })
});

const loginData = await loginResponse.json();

if (loginData.success) {
  const token = loginData.data.token;
  
  // Obtener perfil
  const profileResponse = await fetch('http://localhost:3000/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const profileData = await profileResponse.json();
  console.log(profileData);
}
```

### 3. Usando Postman

1. **Registro:**
   - Method: `POST`
   - URL: `http://localhost:3000/api/auth/register`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
   ```json
   {
     "username": "usuario",
     "email": "usuario@ejemplo.com",
     "password": "contraseña123",
     "firstName": "Nombre",
     "lastName": "Apellido"
   }
   ```

2. **Login:**
   - Method: `POST`
   - URL: `http://localhost:3000/api/auth/login`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
   ```json
   {
     "identifier": "usuario@ejemplo.com",
     "password": "contraseña123"
   }
   ```

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Problema: Error 500 en Login

**Síntomas:**
- API devuelve error 500
- Mensaje: "Error interno del servidor"

**Diagnóstico:**
```bash
# 1. Verificar MongoDB
brew services list | grep mongo

# 2. Verificar variables de entorno
echo $MONGODB_URI
echo $JWT_SECRET

# 3. Verificar logs del servidor
cd server
node index.js
```

**Solución:**
1. Asegúrate de que MongoDB esté corriendo
2. Verifica que el archivo `.env` exista y tenga las variables correctas
3. Reinicia el servidor

### Problema: Error 400 - Datos Inválidos

**Síntomas:**
- API devuelve error 400
- Mensaje sobre datos inválidos

**Solución:**
1. Verifica que el JSON sea válido
2. Asegúrate de que todos los campos requeridos estén presentes
3. Verifica que los tipos de datos sean correctos

### Problema: Error 401 - Credenciales Inválidas

**Síntomas:**
- API devuelve error 401
- Mensaje sobre credenciales incorrectas

**Solución:**
1. Verifica que el usuario exista
2. Asegúrate de que la contraseña sea correcta
3. Registra un nuevo usuario si es necesario

---

## 📝 NOTAS IMPORTANTES

1. **JSON Válido:** Siempre usa comillas dobles en las claves del JSON
2. **Content-Type:** Siempre incluye `Content-Type: application/json` en los headers
3. **Token JWT:** Los tokens expiran en 7 días por defecto
4. **MongoDB:** Asegúrate de que MongoDB esté corriendo antes de usar la API
5. **Variables de Entorno:** El archivo `.env` es necesario para el funcionamiento correcto

---

## 🧪 PRUEBAS

Para ejecutar las pruebas automáticas:

```bash
node test-api.js
```

Este script probará todos los endpoints y mostrará los resultados.

---

**Autor:** Senior Backend Developer  
**Versión:** 1.0.0  
**Última actualización:** Agosto 2024
