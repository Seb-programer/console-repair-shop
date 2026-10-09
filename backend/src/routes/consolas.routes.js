const { Router } = require('express');
const { autenticar, autorizar } = require('../middleware/auth');
const { subirFotos } = require('../middleware/upload');
const c = require('../controllers/consolas.controller');
const rep = require('../controllers/repuestos.controller');

const recepcion = autorizar('operario', 'administrador');
const taller = autorizar('tecnico', 'administrador');

const router = Router();
router.use(autenticar);
router.get('/', c.listar);
router.get('/:id', c.detalle);
// La autorización va antes de multer para no escribir archivos de peticiones no permitidas.
router.post('/', recepcion, subirFotos, c.crear);
router.put('/:id', recepcion, c.actualizar);
router.post('/:id/fotos', recepcion, subirFotos, c.agregarFotos);
router.patch('/:id/estado', taller, c.cambiarEstado);
router.post('/:id/procedimientos', taller, subirFotos, c.registrarProcedimiento);
router.put('/:id/reparacion', taller, c.guardarReparacion);
router.get('/:id/repuestos', rep.listar);
router.post('/:id/repuestos', taller, rep.crear);
router.put('/:id/repuestos/:rid', taller, rep.actualizar);
router.delete('/:id/repuestos/:rid', taller, rep.eliminar);
router.delete('/:id', autorizar('administrador'), c.eliminar);
module.exports = router;
