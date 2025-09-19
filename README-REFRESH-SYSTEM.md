# 🔄 Sistema de Refresh Automático de Tokens JWT

## 📋 Descripción

Sistema implementado para manejar automáticamente la expiración de tokens JWT en la aplicación Fede Life Finanzas. Cuando un token expira, el sistema lo refresca automáticamente sin intervención del usuario.

## 🎯 Funcionalidades

### ✅ Características Principales
- **Detección automática** de errores 401 (Unauthorized)
- **Refresh automático** de tokens expirados
- **Reintento automático** de solicitudes con nuevo token
- **Prevención de loops infinitos** durante el refresh
- **Manejo robusto de errores** y casos edge
- **Refresh preventivo** antes de la expiración del token
- **Limpieza automática** de datos de autenticación si refresh falla

### 🔧 Componentes del Sistema

#### 1. `refreshToken()`
```javascript
// Refresca el token JWT automáticamente
const newToken = await this.refreshToken();
```

#### 2. `authenticatedFetch(url, options)`
```javascript
// Fetch con manejo automático de autenticación
const response = await this.authenticatedFetch('/api/transactions', {
    method: 'GET'
});
```

#### 3. `ensureValidToken(minutesBeforeExpiry)`
```javascript
// Verifica y refresca preventivamente
await this.ensureValidToken(5); // Refresca si expira en menos de 5 minutos
```

#### 4. `apiCall(endpoint, options)`
```javascript
// Método helper simplificado
const result = await this.apiCall('/transactions', {
    method: 'GET'
});
```

## 🚀 Cómo Funciona

### 1. **Flujo Normal de Solicitudes**
```
Usuario hace solicitud → authenticatedFetch() → API → Respuesta exitosa
```

### 2. **Flujo con Token Expirado**
```
Usuario hace solicitud → authenticatedFetch() → Error 401
    ↓
refreshToken() → Nuevo token → Reintento automático → Respuesta exitosa
```

### 3. **Flujo con Refresh Fallido**
```
Usuario hace solicitud → Error 401 → refreshToken() falla
    ↓
Limpieza de localStorage → Notificación → Redirección a login
```

## 📝 Implementación en Código

### Actualización de Funciones Existentes

**Antes (sin refresh automático):**
```javascript
const response = await fetch(`${FINANCE_API_CONFIG.baseUrl}/api/transactions`, {
    method: 'GET',
    headers: this.getAuthHeaders()
});
```

**Después (con refresh automático):**
```javascript
const response = await this.authenticatedFetch('/api/transactions', {
    method: 'GET'
});
```

### Funciones Actualizadas

Las siguientes funciones ahora usan el sistema de refresh automático:

1. **`handleEditTransactionSubmit()`** - Edición de transacciones
2. **`addTransaction()`** - Creación de transacciones
3. **`deleteTransaction()`** - Eliminación de transacciones
4. **`loadGoals()`** - Carga de metas

## 🧪 Pruebas

### Script de Prueba
```bash
# Ejecutar pruebas del sistema de refresh
node test-refresh-system.js
```

### Prueba Manual en Navegador
```javascript
// Abrir consola del navegador y ejecutar:

// 1. Verificar estado del token
financeApp.ensureValidToken(5).then(valid => console.log('Token válido:', valid));

// 2. Probar refresh manual
financeApp.refreshToken().then(token => console.log('Nuevo token:', token));

// 3. Probar llamada API con refresh automático
financeApp.authenticatedFetch('/api/transactions').then(response => console.log('Respuesta:', response.status));
```

## 🔒 Seguridad

### Medidas de Seguridad Implementadas

1. **Prevención de Loops Infinitos**
   - Variable `#isRefreshing` para controlar estado
   - Promesa compartida `#refreshPromise` para múltiples solicitudes concurrentes

2. **Validación de Tokens**
   - Verificación de estructura JWT antes del refresh
   - Validación de respuesta del servidor

3. **Limpieza Automática**
   - Eliminación de datos de localStorage si refresh falla
   - Redirección automática al login

4. **Timeouts y Límites**
   - Sistema de cola para solicitudes pendientes
   - Manejo de concurrencia

## ⚠️ Consideraciones Importantes

### Casos Edge Manejados

1. **Múltiples solicitudes simultáneas**
   - Solo un refresh se ejecuta, las demás esperan el resultado

2. **Refresh fallido**
   - Limpieza automática de datos
   - Notificación al usuario
   - Redirección al login

3. **Token malformado**
   - Detección y manejo de errores de parsing
   - Fallback a login

4. **Servidor no disponible**
   - Manejo de errores de red
   - Reintentos controlados

### Configuración

```javascript
// Configuración por defecto
const DEFAULT_REFRESH_CONFIG = {
    minutesBeforeExpiry: 5,    // Refrescar 5 minutos antes de expirar
    maxRetries: 3,            // Máximo 3 reintentos
    retryDelay: 1000          // 1 segundo entre reintentos
};
```

## 📊 Monitoreo y Logs

### Logs del Sistema
```
🔄 Refrescando token JWT...
✅ Token refrescado exitosamente
🔐 Error 401 detectado, intentando refresh automático...
⏰ Token expira en 3 minutos, refrescando preventivamente...
❌ Error refrescando token: Token inválido
```

### Métricas a Monitorear
- Tasa de éxito de refresh
- Tiempo promedio de refresh
- Número de reintentos automáticos
- Errores de autenticación

## 🔧 Mantenimiento

### Actualización de Funciones
Para agregar refresh automático a nuevas funciones:

```javascript
// Cambiar de:
const response = await fetch(url, { headers: this.getAuthHeaders() });

// A:
const response = await this.authenticatedFetch(url);
```

### Configuración Avanzada
```javascript
// Personalizar comportamiento
await this.ensureValidToken(10); // Refrescar 10 minutos antes
const response = await this.authenticatedFetch(url, options, false); // Sin reintento automático
```

## 🎉 Beneficios

### Para el Usuario
- ✅ **Experiencia seamless** - Sin interrupciones por expiración de sesión
- ✅ **Transparente** - El usuario no nota los refreshes
- ✅ **Automático** - No requiere acción manual

### Para el Sistema
- ✅ **Mejor seguridad** - Tokens se refrescan regularmente
- ✅ **Menos errores 401** - Manejo automático
- ✅ **Mejor performance** - Refresh preventivo antes de expiración
- ✅ **Robustez** - Manejo de casos edge

## 📞 Soporte

Si encuentras problemas con el sistema de refresh:

1. **Verificar logs** en la consola del navegador
2. **Comprobar estado del token** con `financeApp.ensureValidToken()`
3. **Probar refresh manual** con `financeApp.refreshToken()`
4. **Revisar configuración** de `FINANCE_API_CONFIG`

---

**Autor:** Senior Full Stack Developer
**Fecha:** $(date)
**Versión:** 1.0.0
