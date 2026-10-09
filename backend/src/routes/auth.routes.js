const { Router } = require('express');
const { autenticar } = require('../middleware/auth');
const c = require('../controllers/auth.controller');

const router = Router();
router.post('/login', c.login);
router.get('/me', autenticar, c.me);
module.exports = router;
