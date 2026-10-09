const { Router } = require('express');
const { autenticar, autorizar } = require('../middleware/auth');
const c = require('../controllers/ventas.controller');

const router = Router();
router.use(autenticar, autorizar('operario', 'administrador'));
router.get('/', c.listar);
router.get('/:id', c.detalle);
router.post('/', c.crear);
module.exports = router;
