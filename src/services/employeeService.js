const jwt = require('jsonwebtoken');
const employeeModel = require('../models/employeeModel');
const { getEmployeeImageUrl } = require('../utils/employeeUpload');

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

  async createEmployee(data, files, baseUrl) {
    try {
      this.validateEmployeeData(data);

      // Handle image uploads
      if (typeof data.page_access === 'string') {
        try {
          data.page_access = JSON.parse(data.page_access);
        } catch (error) {
          console.error('Error parsing page_access:', error);
        }
      }

      if (files) {
        if (files.profile_img && files.profile_img[0]) {
          data.profile_img = getEmployeeImageUrl(files.profile_img[0].filename, baseUrl);
        }
        if (files.document_img && files.document_img[0]) {
          data.document_img = getEmployeeImageUrl(files.document_img[0].filename, baseUrl);
        }
      }

      return await employeeModel.create(data);
    } catch (error) {
      throw new Error(`Failed to create employee: ${error.message}`);
    }
  }

  async updateEmployee(id, data, files, baseUrl) {
    try {
      const existingEmployee = await employeeModel.getById(id);
      if (!existingEmployee) {
        throw new Error('Employee not found');
      }
      if (typeof data.page_access === 'string') {
        try {
          data.page_access = JSON.parse(data.page_access);
        } catch (error) {
          console.error('Error parsing page_access:', error);
        }
      }

      const payload = {
        ...existingEmployee,
        ...data
      };

      if (files?.profile_img?.[0]) {
        payload.profile_img = getEmployeeImageUrl(files.profile_img[0].filename, baseUrl);
      }

      if (files?.document_img?.[0]) {
        payload.document_img = getEmployeeImageUrl(files.document_img[0].filename, baseUrl);
      }

      return await employeeModel.update(id, payload);
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
      page_access: employee.page_access,
      designation: employee.designation || null,
      department: employee.department || null
    };
    payload.profile_img = employee.profile_img ?? null;
    payload.document_img = employee.document_img ?? null;

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





