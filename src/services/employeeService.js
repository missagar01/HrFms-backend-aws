const jwt = require('jsonwebtoken');
const employeeModel = require('../models/employeeModel');
const { getEmployeeImageUrl } = require('../utils/employeeUpload');
const { invalidateCache, getOrSetCache } = require('../utils/cache');

class EmployeeService {
  async getAllEmployees() {
    return getOrSetCache('employees:all', 10, async () => {
      try {
        return await employeeModel.getAll();
      } catch (error) {
        throw new Error(`Failed to fetch employees: ${error.message}`);
      }
    });
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

      const result = await employeeModel.create(data);
      // Invalidate Caches
      await Promise.all([
        invalidateCache('dashboard:admin:global'),
        invalidateCache('employees:*')
      ]);
      return result;
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

      const result = await employeeModel.update(id, payload);
      // Invalidate Caches
      await Promise.all([
        invalidateCache('dashboard:admin:global'),
        invalidateCache(`dashboard:details:${existingEmployee.employee_id}`),
        invalidateCache(`dashboard:user:${existingEmployee.employee_id}:*`),
        invalidateCache('employees:*')
      ]);
      return result;
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
      const result = await employeeModel.remove(id);
      // Invalidate Caches
      await Promise.all([
        invalidateCache('dashboard:admin:global'),
        invalidateCache(`dashboard:details:${existingEmployee.employee_id}`),
        invalidateCache(`dashboard:user:${existingEmployee.employee_id}:*`),
        invalidateCache('employees:*')
      ]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async loginEmployee(identifier, password) {
    if (!identifier || !password) {
      throw new Error('User Name/Employee ID and password are required');
    }

    const employee = await employeeModel.getByCredentials(identifier, password);
    if (!employee) {
      throw new Error('Invalid credentials');
    }

    const payload = {
      id: employee.id,
      employee_id: employee.employee_id,
      user_name: employee.user_name,
      email_id: employee.email_id,
      number: employee.number,
      role: employee.role,
      page_access: employee.page_access,
      system_access: employee.user_access || null,
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
    return getOrSetCache('employees:departments', 3600, async () => {
      try {
        return await employeeModel.getDistinctDepartments();
      } catch (error) {
        throw new Error(`Failed to fetch departments: ${error.message}`);
      }
    });
  }

  async getDistinctDesignations() {
    return getOrSetCache('employees:designations', 3600, async () => {
      try {
        return await employeeModel.getDistinctDesignations();
      } catch (error) {
        throw new Error(`Failed to fetch designations: ${error.message}`);
      }
    });
  }

  validateEmployeeData(data) {
    const requiredFields = [
      'employee_id',
      'password'
    ];

    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Email validation (only when provided)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email_id && !emailRegex.test(data.email_id)) {
      throw new Error('Invalid email format');
    }
  }
}

module.exports = new EmployeeService();

