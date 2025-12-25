const requestModel = require('../models/requestModel');

class RequestService {
  async getAllRequests() {
    try {
      return await requestModel.findAll();
    } catch (error) {
      throw new Error(`Failed to fetch requests: ${error.message}`);
    }
  }

  async getRequestById(id) {
    try {
      const request = await requestModel.findById(id);
      if (!request) {
        throw new Error('Request not found');
      }
      return request;
    } catch (error) {
      throw error;
    }
  }

  async createRequest(data) {
    try {
      // Normalize data: convert empty strings to null for optional fields
      const normalizedData = this.normalizeRequestData(data);
      // Validate required fields
      this.validateRequestData(normalizedData);
      return await requestModel.create(normalizedData);
    } catch (error) {
      throw new Error(`Failed to create request: ${error.message}`);
    }
  }

  normalizeRequestData(data) {
    const normalized = { ...data };
    
    // Convert empty strings to null for all fields
    Object.keys(normalized).forEach(key => {
      if (normalized[key] === '' || normalized[key] === undefined) {
        normalized[key] = null;
      }
    });

    // Convert integer fields: empty string or null to null, otherwise parse
    const integerFields = ['no_of_person', 'request_quantity'];
    integerFields.forEach(field => {
      if (normalized[field] === '' || normalized[field] === null || normalized[field] === undefined) {
        normalized[field] = null;
      } else {
        const parsed = parseInt(normalized[field], 10);
        normalized[field] = isNaN(parsed) ? null : parsed;
      }
    });

    // Ensure request_status has a default value if empty
    if (!normalized.request_status) {
      normalized.request_status = 'Open';
    }

    return normalized;
  }

  async updateRequest(id, data) {
    try {
      const existingRequest = await requestModel.findById(id);
      if (!existingRequest) {
        throw new Error('Request not found');
      }
      // Normalize data for update as well
      const normalizedData = this.normalizeRequestData(data);
      return await requestModel.update(id, normalizedData);
    } catch (error) {
      throw error;
    }
  }

  async deleteRequest(id) {
    try {
      const existingRequest = await requestModel.findById(id);
      if (!existingRequest) {
        throw new Error('Request not found');
      }
      return await requestModel.delete(id);
    } catch (error) {
      throw error;
    }
  }

  validateRequestData(data) {
    // Validate dates (only if both are provided)
    if (data.from_date && data.to_date) {
      const fromDate = new Date(data.from_date);
      const toDate = new Date(data.to_date);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new Error('Invalid date format');
      }
      if (fromDate > toDate) {
        throw new Error('from_date cannot be after to_date');
      }
    }

    // Validate number of persons (only if provided and not null)
    if (data.no_of_person !== null && data.no_of_person !== undefined) {
      if (isNaN(data.no_of_person) || data.no_of_person < 1) {
        throw new Error('no_of_person must be a positive number');
      }
    }

    // Validate request quantity (only if provided and not null)
    if (data.request_quantity !== null && data.request_quantity !== undefined) {
      if (isNaN(data.request_quantity) || data.request_quantity < 1) {
        throw new Error('request_quantity must be a positive number');
      }
    }
  }
}

module.exports = new RequestService();

