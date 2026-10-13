const express = require('express');
const router = express.Router();
const { getAllSettings, updateSettings, calculateFare } = require('../controllers/fareController');
const { protect } = require('../middleware/authMiddleware'); 

router.get('/', protect, getAllSettings);
router.post('/', protect, updateSettings);
router.post('/calculate', protect, calculateFare); 

module.exports = router;