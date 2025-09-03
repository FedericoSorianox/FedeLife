/**
 * 🧪 ARCHIVO DE PRUEBA DE RUTAS - FEDE LIFE
 * 
 * Archivo para probar las rutas públicas del servidor
 * Autor: Senior Backend Developer
 */

const express = require('express');
const app = express();
const PORT = 3001;

// Middleware básico
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de prueba simple
app.get('/api/test', (req, res) => {
    res.json({ message: 'Ruta de prueba funcionando', timestamp: new Date().toISOString() });
});

// Ruta pública para transacciones
app.post('/api/public/transactions/public', (req, res) => {
    console.log('📝 Transacción recibida:', req.body);
    res.json({
        success: true,
        message: 'Transacción creada exitosamente (modo demo)',
        data: {
            transaction: {
                id: 'test_' + Date.now(),
                ...req.body,
                createdAt: new Date()
            }
        }
    });
});

// Ruta pública para categorías
app.get('/api/public/categories/public', (req, res) => {
    const defaultCategories = [
        { id: 'cat_1', name: 'Salario', type: 'income', color: '#27ae60' },
        { id: 'cat_2', name: 'Comida', type: 'expense', color: '#e74c3c' },
        { id: 'cat_3', name: 'Transporte', type: 'expense', color: '#f39c12' }
    ];
    
    res.json({
        success: true,
        data: { categories: defaultCategories }
    });
});

// Ruta pública para IA
app.post('/api/public/ai/analyze-pdf', (req, res) => {
    console.log('🤖 PDF recibido para análisis');
    res.json({
        success: true,
        message: 'PDF analizado exitosamente',
        data: {
            fileName: 'test.pdf',
            analysis: {
                expenses: [
                    { description: 'Gasto de prueba', amount: 1000, category: 'General', date: new Date().toISOString().split('T')[0] }
                ]
            }
        }
    });
});

// Iniciar servidor de prueba
app.listen(PORT, () => {
    console.log(`🧪 Servidor de prueba funcionando en puerto ${PORT}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`📝 POST /api/public/transactions/public`);
    console.log(`🏷️ GET /api/public/categories/public`);
    console.log(`🤖 POST /api/public/ai/analyze-pdf`);
});
