const { Router } = require('express');
const { autenticar } = require('../middleware/auth');
const c = require('../controllers/dashboard.controller');

const router = Router();
router.get('/', autenticar, c.resumen);
module.exports = router;
