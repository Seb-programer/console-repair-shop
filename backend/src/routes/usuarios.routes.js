const { Router } = require('express');
const { autenticar, autorizar } = require('../middleware/auth');
const c = require('../controllers/usuarios.controller');

const router = Router();
router.use(autenticar, autorizar('administrador'));
router.get('/', c.listar);
router.post('/', c.crear);
router.put('/:id', c.actualizar);
router.delete('/:id', c.desactivar);
module.exports = router;
