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
      console.log('🟠 === SERVICE: createRequest called ===');
      console.log('🟠 Input data:', JSON.stringify(data, null, 2));
      console.log('🟠 from_city:', data.from_city, 'type:', typeof data.from_city);
      console.log('🟠 to_city:', data.to_city, 'type:', typeof data.to_city);
      
      // Normalize data: convert empty strings to null for optional fields
      const normalizedData = this.normalizeRequestData(data);
      
      console.log('🟠 === SERVICE: After normalization ===');
      console.log('🟠 Normalized from_city:', normalizedData.from_city, 'type:', typeof normalizedData.from_city);
      console.log('🟠 Normalized to_city:', normalizedData.to_city, 'type:', typeof normalizedData.to_city);
      console.log('🟠 Full normalized data:', JSON.stringify(normalizedData, null, 2));
      
      // Validate required fields
      this.validateRequestData(normalizedData);
      
      console.log('🟠 === SERVICE: Calling model.create ===');
      const result = await requestModel.create(normalizedData);
      console.log('🟠 === SERVICE: Model returned ===');
      console.log('🟠 Result from_city:', result?.from_city);
      console.log('🟠 Result to_city:', result?.to_city);
      return result;
    } catch (error) {
      console.error('🟠 SERVICE ERROR:', error.message);
      console.error('🟠 ERROR STACK:', error.stack);
      throw new Error(`Failed to create request: ${error.message}`);
    }
  }

  normalizeRequestData(data) {
    const normalized = { ...data };
    
    console.log('=== NORMALIZE: Input data ===');
    console.log('from_city input:', normalized.from_city, 'type:', typeof normalized.from_city);
    console.log('to_city input:', normalized.to_city, 'type:', typeof normalized.to_city);
    
    // Normalize city fields explicitly to keep their values when provided.
    ['from_city', 'to_city'].forEach((field) => {
      const value = normalized[field];
      
      // If null or undefined, set to null
      if (value === null || value === undefined) {
        normalized[field] = null;
        console.log(`${field}: null/undefined -> null`);
        return;
      }
      
      // If empty string, set to null
      if (value === '') {
        normalized[field] = null;
        console.log(`${field}: empty string -> null`);
        return;
      }
      
      // If it's a string, trim it
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          normalized[field] = trimmed;
          console.log(`${field}: "${value}" -> "${trimmed}"`);
        } else {
          normalized[field] = null;
          console.log(`${field}: whitespace only -> null`);
        }
      } else {
        // If it's not a string, convert to string first, then trim
        const strValue = String(value).trim();
        if (strValue.length > 0) {
          normalized[field] = strValue;
          console.log(`${field}: ${value} -> "${strValue}"`);
        } else {
          normalized[field] = null;
          console.log(`${field}: converted to empty -> null`);
        }
      }
    });

    console.log('=== NORMALIZE: After city processing ===');
    console.log('from_city:', normalized.from_city, 'type:', typeof normalized.from_city);
    console.log('to_city:', normalized.to_city, 'type:', typeof normalized.to_city);

    // Convert empty strings to null for all fields
    Object.keys(normalized).forEach(key => {
      if (key !== 'from_city' && key !== 'to_city') {
        if (normalized[key] === '' || normalized[key] === undefined) {
          normalized[key] = null;
        }
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
    // Required city fields
    const cityFields = ['from_city', 'to_city'];
    cityFields.forEach((field) => {
      const value = data[field];
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`${field} is required`);
      }
    });

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
