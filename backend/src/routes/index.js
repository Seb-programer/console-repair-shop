const { Router } = require('express');

const router = Router();
router.get('/salud', (req, res) => res.json({ estado: 'ok' }));
router.use('/auth', require('./auth.routes'));
router.use('/usuarios', require('./usuarios.routes'));
router.use('/clientes', require('./clientes.routes'));
router.use('/consolas', require('./consolas.routes'));
router.use('/articulos', require('./articulos.routes'));
router.use('/ventas', require('./ventas.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/negocio', require('./negocio.routes'));
router.use('/galeria', require('./galeria.routes'));
router.use('/publico', require('./publico.routes'));
module.exports = router;
