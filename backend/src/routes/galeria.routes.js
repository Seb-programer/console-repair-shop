const { Router } = require('express');
const { autenticar, autorizar } = require('../middleware/auth');
const { subirArchivoGaleria } = require('../middleware/upload');
const c = require('../controllers/galeria.controller');

const router = Router();
// La autorización va antes de multer para no escribir archivos de peticiones no permitidas.
router.use(autenticar, autorizar('administrador'));
router.get('/', c.listar);
router.post('/', subirArchivoGaleria, c.crear);
router.put('/:id', c.actualizar);
router.delete('/:id', c.eliminar);
module.exports = router;
