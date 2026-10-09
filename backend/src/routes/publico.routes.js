const { Router } = require('express');
const { limiteConsulta } = require('../middleware/limiteIntentos');
const c = require('../controllers/publico.controller');

// Rutas sin autenticación para la página pública. Solo exponen datos pensados para clientes.
const router = Router();
router.get('/negocio', c.negocio);
router.get('/galeria', c.galeria);
router.get('/articulos', c.articulos);
router.post('/consulta', limiteConsulta, c.consulta);
module.exports = router;
