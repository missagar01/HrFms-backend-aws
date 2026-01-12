const express = require('express');
const requestController = require('../controllers/requestController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Add logging middleware for POST requests
router.post('/', (req, res, next) => {
  console.log('🔵 ROUTE: POST /api/requests received');
  console.log('🔵 Request body:', JSON.stringify(req.body, null, 2));
  console.log('🔵 from_city:', req.body.from_city);
  console.log('🔵 to_city:', req.body.to_city);
  next();
}, requestController.createRequest.bind(requestController));

router.get('/', requestController.getAllRequests.bind(requestController));
router.get('/:id', requestController.getRequestById.bind(requestController));
router.put('/:id', requestController.updateRequest.bind(requestController));
router.delete('/:id',  requestController.deleteRequest.bind(requestController));

module.exports = router;

