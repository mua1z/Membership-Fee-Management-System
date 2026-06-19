const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/newsController');

router.get('/latest', ctrl.getLatest);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

router.post('/', auth, authorize('admin'), ctrl.upload.single('image'), ctrl.create);
router.put('/:id', auth, authorize('admin'), ctrl.upload.single('image'), ctrl.update);
router.delete('/:id', auth, authorize('admin'), ctrl.remove);

module.exports = router;
