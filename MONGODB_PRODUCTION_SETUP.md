# 🗄️ CONFIGURACIÓN DE MONGODB PARA PRODUCCIÓN

## 📋 Índice
1. [MongoDB Atlas (Recomendado)](#mongodb-atlas-recomendado)
2. [MongoDB en Servidor Propio](#mongodb-en-servidor-propio)
3. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
4. [Seguridad y Optimización](#seguridad-y-optimización)
5. [Monitoreo y Backup](#monitoreo-y-backup)

---

## ☁️ MONGODB ATLAS (RECOMENDADO)

### Paso 1: Crear Cuenta en MongoDB Atlas

1. Ve a [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Haz clic en "Try Free"
3. Completa el registro

### Paso 2: Crear Cluster

1. **Selecciona el Plan:**
   - Free Tier (M0) - Gratis
   - Shared Cluster
   - Cloud Provider: AWS, Google Cloud, o Azure

2. **Configuración del Cluster:**
   - Cluster Name: `fede-life-prod`
   - Database Version: Latest
   - Cloud Provider: El que prefieras
   - Region: La más cercana a tus usuarios

### Paso 3: Configurar Seguridad

1. **Crear Usuario de Base de Datos:**
   ```
   Username: fede-life-admin
   Password: [contraseña-super-segura]
   Built-in Role: Atlas admin
   ```

2. **Configurar IP Whitelist:**
   - Para desarrollo: `0.0.0.0/0` (cualquier IP)
   - Para producción: IP específica de tu servidor

### Paso 4: Obtener Connection String

1. Ve a "Connect" en tu cluster
2. Selecciona "Connect your application"
3. Copia la connection string

**Ejemplo de Connection String:**
```
mongodb+srv://fede-life-admin:<password>@cluster0.xxxxx.mongodb.net/fede-life-finanzas?retryWrites=true&w=majority
```

---

## 🖥️ MONGODB EN SERVIDOR PROPIO

### Paso 1: Instalar MongoDB en el Servidor

**Ubuntu/Debian:**
```bash
# Importar clave pública
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Agregar repositorio
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Actualizar e instalar
sudo apt-get update
sudo apt-get install -y mongodb-org

# Iniciar servicio
sudo systemctl start mongod
sudo systemctl enable mongod
```

**CentOS/RHEL:**
```bash
# Crear archivo de repositorio
sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo << EOF
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF

# Instalar MongoDB
sudo yum install -y mongodb-org

# Iniciar servicio
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Paso 2: Configurar MongoDB

**Editar configuración:**
```bash
sudo nano /etc/mongod.conf
```

**Configuración recomendada:**
```yaml
# network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1  # Solo localhost para seguridad

# security
security:
  authorization: enabled

# storage
storage:
  dbPath: /var/lib/mongo
  journal:
    enabled: true

# systemLog
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
```

### Paso 3: Crear Usuario Administrador

```bash
# Conectar a MongoDB
mongosh

# Crear usuario admin
use admin
db.createUser({
  user: "fede-life-admin",
  pwd: "tu-contraseña-super-segura",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

# Salir
exit
```

### Paso 4: Reiniciar MongoDB

```bash
sudo systemctl restart mongod
sudo systemctl status mongod
```

---

## 🔧 CONFIGURACIÓN DE VARIABLES DE ENTORNO

### Para MongoDB Atlas:

```env
# ==================== PRODUCCIÓN - MONGODB ATLAS ====================
MONGODB_URI=mongodb+srv://fede-life-admin:tu-contraseña@cluster0.xxxxx.mongodb.net/fede-life-finanzas?retryWrites=true&w=majority

# ==================== CONFIGURACIÓN DE AUTENTICACIÓN ====================
JWT_SECRET=tu-jwt-secret-super-seguro-y-largo-para-produccion
JWT_EXPIRES_IN=7d

# ==================== CONFIGURACIÓN DEL SERVIDOR ====================
PORT=3000
NODE_ENV=production

# ==================== CONFIGURACIÓN DE SEGURIDAD ====================
# Rate limiting más estricto en producción
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# ==================== CONFIGURACIÓN DE LOGS ====================
LOG_LEVEL=error
```

### Para MongoDB Local:

```env
# ==================== PRODUCCIÓN - MONGODB LOCAL ====================
MONGODB_URI=mongodb://fede-life-admin:tu-contraseña@localhost:27017/fede-life-finanzas?authSource=admin

# ==================== CONFIGURACIÓN DE AUTENTICACIÓN ====================
JWT_SECRET=tu-jwt-secret-super-seguro-y-largo-para-produccion
JWT_EXPIRES_IN=7d

# ==================== CONFIGURACIÓN DEL SERVIDOR ====================
PORT=3000
NODE_ENV=production

# ==================== CONFIGURACIÓN DE SEGURIDAD ====================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# ==================== CONFIGURACIÓN DE LOGS ====================
LOG_LEVEL=error
```

---

## 🔒 SEGURIDAD Y OPTIMIZACIÓN

### 1. Configuración de Seguridad

**MongoDB Atlas:**
- Usar IP Whitelist
- Usar contraseñas fuertes
- Habilitar MFA para la cuenta
- Usar VPC Peering si es posible

**MongoDB Local:**
- Configurar firewall
- Usar autenticación
- Limitar acceso por IP
- Usar SSL/TLS

### 2. Optimización de Conexión

**Actualizar configuración de conexión en `server/index.js`:**

```javascript
// Configuración optimizada para producción
const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10, // Número máximo de conexiones
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferMaxEntries: 0,
    bufferCommands: false,
    // Configuración de SSL para Atlas
    ssl: process.env.NODE_ENV === 'production',
    sslValidate: process.env.NODE_ENV === 'production',
    // Configuración de retry
    retryWrites: true,
    w: 'majority'
};

await mongoose.connect(MONGODB_URI, mongoOptions);
```

### 3. Configuración de Índices

**Crear índices para optimizar consultas:**

```javascript
// En server/models/User.js, agregar después de la definición del esquema
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });
```

---

## 📊 MONITOREO Y BACKUP

### 1. Monitoreo

**MongoDB Atlas:**
- Métricas automáticas
- Alertas configurables
- Logs centralizados

**MongoDB Local:**
```bash
# Verificar estado
sudo systemctl status mongod

# Ver logs
sudo tail -f /var/log/mongodb/mongod.log

# Verificar conexiones
mongosh --eval "db.serverStatus().connections"
```

### 2. Backup

**MongoDB Atlas:**
- Backups automáticos
- Point-in-time recovery
- Export/Import tools

**MongoDB Local:**
```bash
# Backup manual
mongodump --db fede-life-finanzas --out /backup/$(date +%Y%m%d)

# Restore
mongorestore --db fede-life-finanzas /backup/20240831/fede-life-finanzas/

# Script de backup automático
#!/bin/bash
BACKUP_DIR="/backup/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --db fede-life-finanzas --out $BACKUP_DIR/$DATE
```

---

## 🚀 DESPLIEGUE EN PRODUCCIÓN

### 1. Render.com (Recomendado)

**Variables de entorno en Render:**
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=tu-secret-super-seguro
NODE_ENV=production
PORT=3000
```

### 2. Heroku

**Variables de entorno en Heroku:**
```bash
heroku config:set MONGODB_URI="mongodb+srv://..."
heroku config:set JWT_SECRET="tu-secret-super-seguro"
heroku config:set NODE_ENV="production"
```

### 3. VPS/DigitalOcean

**Instalar PM2 para gestión de procesos:**
```bash
npm install -g pm2

# Iniciar aplicación
pm2 start server/index.js --name "fede-life-api"

# Configurar para iniciar automáticamente
pm2 startup
pm2 save
```

---

## 🧪 PRUEBAS EN PRODUCCIÓN

### 1. Verificar Conexión

```bash
# Health check
curl https://tu-dominio.com/api/health

# Auth health check
curl https://tu-dominio.com/api/auth/health
```

### 2. Probar Endpoints

```bash
# Login
curl -X POST https://tu-dominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@ejemplo.com","password":"test123"}'
```

---

## 📝 CHECKLIST DE PRODUCCIÓN

- [ ] MongoDB Atlas configurado o MongoDB local instalado
- [ ] Usuario de base de datos creado con permisos adecuados
- [ ] Variables de entorno configuradas
- [ ] IP Whitelist configurada (si aplica)
- [ ] SSL/TLS habilitado
- [ ] Backups configurados
- [ ] Monitoreo configurado
- [ ] Logs configurados
- [ ] Rate limiting configurado
- [ ] Tests ejecutados en producción

---

**Autor:** Senior Backend Developer  
**Versión:** 1.0.0  
**Última actualización:** Agosto 2024
