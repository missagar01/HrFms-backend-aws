const jwt = require('jsonwebtoken');
const employeeModel = require('../models/employeeModel');

class EmployeeService {
  async getAllEmployees() {
    try {
      return await employeeModel.getAll();
    } catch (error) {
      throw new Error(`Failed to fetch employees: ${error.message}`);
    }
  }

  async getEmployeeById(id) {
    try {
      const employee = await employeeModel.getById(id);
      if (!employee) {
        throw new Error('Employee not found');
      }
      return employee;
    } catch (error) {
      throw error;
    }
  }

  async createEmployee(data) {
    try {
      this.validateEmployeeData(data);
      return await employeeModel.create(data);
    } catch (error) {
      throw new Error(`Failed to create employee: ${error.message}`);
    }
  }

  async updateEmployee(id, data) {
    try {
      const existingEmployee = await employeeModel.getById(id);
      if (!existingEmployee) {
        throw new Error('Employee not found');
      }
      return await employeeModel.update(id, data);
    } catch (error) {
      throw error;
    }
  }

  async deleteEmployee(id) {
    try {
      const existingEmployee = await employeeModel.getById(id);
      if (!existingEmployee) {
        throw new Error('Employee not found');
      }
      return await employeeModel.remove(id);
    } catch (error) {
      throw error;
    }
  }

  async loginEmployee(employeeCode, password) {
    if (!employeeCode || !password) {
      throw new Error('Employee code and password are required');
    }

    const employee = await employeeModel.getByCredentials(employeeCode, password);
    if (!employee) {
      throw new Error('Invalid credentials');
    }

    const payload = {
      id: employee.id,
      employee_code: employee.employee_code,
      employee_name: employee.employee_name,
      email: employee.email,
      role: employee.role,
      designation: employee.designation || null,
      department: employee.department || null
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '30d'
    });

    return { token, employee: payload };
  }

  async getDistinctDepartments() {
    try {
      return await employeeModel.getDistinctDepartments();
    } catch (error) {
      throw new Error(`Failed to fetch departments: ${error.message}`);
    }
  }

  async getDistinctDesignations() {
    try {
      return await employeeModel.getDistinctDesignations();
    } catch (error) {
      throw new Error(`Failed to fetch designations: ${error.message}`);
    }
  }

  validateEmployeeData(data) {
    const requiredFields = [
      'employee_code',
      'password'
    ];

    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Email validation (only when provided)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
      throw new Error('Invalid email format');
    }
  }
}

module.exports = new EmployeeService();

