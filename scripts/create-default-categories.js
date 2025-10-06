/**
 * Script para crear categorías por defecto del sistema
 * Ejecutar: node scripts/create-default-categories.js
 */

const mongoose = require('mongoose');
const connectToDatabase = require('../lib/mongodb');

// Definir el esquema de Category (igual que en el modelo)
const categorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['income', 'expense'] },
  color: { type: String, required: true },
  description: { type: String },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

// Crear modelo
const CategoryModel = mongoose.model('Category', categorySchema);

// Categorías por defecto del sistema
const defaultCategories = [
  // Categorías de Ingresos
  { name: 'Salario', type: 'income', color: '#10B981', description: 'Ingresos por trabajo', isDefault: true },
  { name: 'Freelance', type: 'income', color: '#3B82F6', description: 'Trabajos independientes', isDefault: true },
  { name: 'Inversiones', type: 'income', color: '#8B5CF6', description: 'Ganancias de inversiones', isDefault: true },
  { name: 'Alquiler', type: 'income', color: '#06B6D4', description: 'Ingresos por alquiler', isDefault: true },
  { name: 'Otros Ingresos', type: 'income', color: '#84CC16', description: 'Otros ingresos varios', isDefault: true },

  // Categorías de Gastos
  { name: 'Alimentación', type: 'expense', color: '#EF4444', description: 'Comida y restaurantes', isDefault: true },
  { name: 'Transporte', type: 'expense', color: '#F59E0B', description: 'Transporte público y combustible', isDefault: true },
  { name: 'Servicios', type: 'expense', color: '#F97316', description: 'Luz, agua, gas, internet', isDefault: true },
  { name: 'Entretenimiento', type: 'expense', color: '#8B5CF6', description: 'Cine, teatro, hobbies', isDefault: true },
  { name: 'Salud', type: 'expense', color: '#10B981', description: 'Médicos, medicamentos, seguros', isDefault: true },
  { name: 'Educación', type: 'expense', color: '#3B82F6', description: 'Cursos, libros, educación', isDefault: true },
  { name: 'Ropa', type: 'expense', color: '#EC4899', description: 'Ropa y accesorios', isDefault: true },
  { name: 'Casa', type: 'expense', color: '#6B7280', description: 'Mantenimiento del hogar', isDefault: true },
  { name: 'Transferencias', type: 'expense', color: '#6366F1', description: 'Transferencias entre cuentas', isDefault: true },
  { name: 'Otros Gastos', type: 'expense', color: '#94A3B8', description: 'Otros gastos varios', isDefault: true }
];

async function createDefaultCategories() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await connectToDatabase();

    console.log('📊 Verificando categorías existentes...');

    // Verificar qué categorías ya existen
    const existingCategories = await CategoryModel.find({ userId: null, isDefault: true });
    console.log(`📋 Encontradas ${existingCategories.length} categorías por defecto existentes`);

    if (existingCategories.length > 0) {
      console.log('📝 Categorías existentes:');
      existingCategories.forEach(cat => {
        console.log(`  - ${cat.name} (${cat.type}) - Color: ${cat.color}`);
      });
    }

    // Filtrar categorías que no existen aún
    const existingNames = existingCategories.map(cat => cat.name);
    const categoriesToCreate = defaultCategories.filter(cat => !existingNames.includes(cat.name));

    if (categoriesToCreate.length === 0) {
      console.log('✅ Todas las categorías por defecto ya existen');
      return;
    }

    console.log(`🆕 Creando ${categoriesToCreate.length} categorías por defecto...`);

    // Crear categorías faltantes
    const createdCategories = await CategoryModel.insertMany(categoriesToCreate);

    console.log('✅ Categorías creadas exitosamente:');
    createdCategories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.type}) - Color: ${cat.color}`);
    });

    // Verificar total final
    const finalCategories = await CategoryModel.find({ userId: null, isDefault: true });
    console.log(`📊 Total de categorías por defecto: ${finalCategories.length}`);

  } catch (error) {
    console.error('❌ Error creando categorías por defecto:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar el script
console.log('🚀 Iniciando creación de categorías por defecto...');
createDefaultCategories();
