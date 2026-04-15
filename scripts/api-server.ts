import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno ANTES de importar los handlers
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import numbersHandler from '../api/external/numbers.js';

const app = express();
const PORT = 3001; // Usamos el 3001 para no chocar con Vite si está en el 3000

// Middleware para parsear JSON
app.use(express.json());

// Emulación de Vercel Request/Response en Express
const vLink = (handler: any) => async (req: express.Request, res: express.Response) => {
    // Adaptar req/res de Express a lo que espera el handler de Vercel (si es necesario)
    // En la mayoría de los casos son compatibles o el handler es agnóstico
    try {
        await handler(req, res);
    } catch (err: any) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
};

// Rutas
app.all('/api/external/numbers', vLink(numbersHandler));

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor de API Telsim (Local) corriendo en:`);
    console.log(`🔗 http://localhost:${PORT}/api/external/numbers`);
    console.log(`\n💡 Ya puedes apuntar GoAuth a esta URL.`);
    console.log(`Presiona Ctrl+C para detener.\n`);
});
