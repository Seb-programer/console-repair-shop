const { Router } = require('express');
const { autenticar, autorizar } = require('../middleware/auth');
const { subirLogo } = require('../middleware/upload');
const c = require('../controllers/negocio.controller');

const router = Router();
router.use(autenticar, autorizar('administrador'));
router.get('/', c.obtener);
// La autorización va antes de multer para no escribir archivos de peticiones no permitidas.
router.put('/', subirLogo, c.actualizar);
module.exports = router;
