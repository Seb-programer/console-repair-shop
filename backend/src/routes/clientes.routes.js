const { Router } = require('express');
const { autenticar, autorizar } = require('../middleware/auth');
const c = require('../controllers/clientes.controller');

const router = Router();
router.use(autenticar);
router.get('/', c.listar);
router.get('/:id', c.detalle);
router.post('/', autorizar('operario', 'administrador'), c.crear);
router.put('/:id', autorizar('operario', 'administrador'), c.actualizar);
module.exports = router;
