const express = require('express');
const employeeController = require('../controllers/employeeController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { uploadEmployeeImages } = require('../utils/employeeUpload');

const router = express.Router();

router.post('/login', employeeController.loginEmployee.bind(employeeController));
router.post('/', uploadEmployeeImages, employeeController.createEmployee.bind(employeeController));
router.get('/departments', employeeController.getDepartments.bind(employeeController));
router.get('/designations', employeeController.getDesignations.bind(employeeController));

router.use(authenticateToken);
router.get('/', employeeController.listEmployees.bind(employeeController));
router.get('/:id', employeeController.getEmployee.bind(employeeController));
router.put('/:id', uploadEmployeeImages, employeeController.updateEmployee.bind(employeeController));
router.delete('/:id', authorizeRoles('Admin'), employeeController.deleteEmployee.bind(employeeController));

module.exports = router;


