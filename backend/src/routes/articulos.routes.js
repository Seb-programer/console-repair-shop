const { Router } = require('express');
const { autenticar, autorizar } = require('../middleware/auth');
const { subirFoto } = require('../middleware/upload');
const c = require('../controllers/articulos.controller');

const admin = autorizar('administrador');

const router = Router();
router.use(autenticar);
router.get('/', c.listar);
router.get('/:id', c.detalle);
router.post('/', admin, subirFoto, c.crear);
router.put('/:id', admin, subirFoto, c.actualizar);
router.delete('/:id', admin, c.desactivar);
module.exports = router;
