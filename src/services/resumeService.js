const resumeModel = require('../models/resumeModel');

class ResumeService {
  async getAllResumes() {
    try {
      return await resumeModel.findAll();
    } catch (error) {
      throw new Error(`Failed to fetch resumes: ${error.message}`);
    }
  }

  async getResumeById(id) {
    try {
      const resume = await resumeModel.findById(id);
      if (!resume) {
        throw new Error('Resume not found');
      }
      return resume;
    } catch (error) {
      throw error;
    }
  }

  async createResume(data) {
    try {
      // Normalize data: convert empty strings to null for optional fields
      const normalizedData = this.normalizeResumeData(data);
      this.validateResumeData(normalizedData);
      return await resumeModel.create(normalizedData);
    } catch (error) {
      throw new Error(`Failed to create resume: ${error.message}`);
    }
  }

  normalizeResumeData(data) {
    const normalized = { ...data };
    
    // Convert empty strings to null for all fields
    Object.keys(normalized).forEach(key => {
      if (normalized[key] === '' || normalized[key] === undefined) {
        normalized[key] = null;
      }
    });

    // Handle timestamp fields - convert empty strings to null
    const timestampFields = ['interviewer_planned', 'interviewer_actual'];
    timestampFields.forEach(field => {
      if (normalized[field] === '' || normalized[field] === null || normalized[field] === undefined) {
        normalized[field] = null;
      } else if (typeof normalized[field] === 'string') {
        // If it's a string, try to parse it as a timestamp
        // Empty string or invalid date should be null
        const date = new Date(normalized[field]);
        if (isNaN(date.getTime())) {
          normalized[field] = null;
        } else {
          // Keep as ISO string, PostgreSQL will handle it
          normalized[field] = date.toISOString();
        }
      }
    });

    // Handle numeric fields
    if (normalized.experience !== null && normalized.experience !== undefined && normalized.experience !== '') {
      const parsed = parseFloat(normalized.experience);
      normalized.experience = isNaN(parsed) ? null : parsed.toString();
    } else {
      normalized.experience = null;
    }

    if (normalized.previous_salary !== null && normalized.previous_salary !== undefined && normalized.previous_salary !== '') {
      const parsed = parseFloat(normalized.previous_salary);
      normalized.previous_salary = isNaN(parsed) ? null : parsed;
    } else {
      normalized.previous_salary = null;
    }

    return normalized;
  }

  async updateResume(id, data) {
    try {
      const existingResume = await resumeModel.findById(id);
      if (!existingResume) {
        throw new Error('Resume not found');
      }
      // Normalize data for update as well
      const normalizedData = this.normalizeResumeData(data);
      this.validateResumeData({ ...existingResume, ...normalizedData });
      return await resumeModel.update(id, normalizedData);
    } catch (error) {
      throw error;
    }
  }

  async deleteResume(id) {
    try {
      const existingResume = await resumeModel.findById(id);
      if (!existingResume) {
        throw new Error('Resume not found');
      }
      return await resumeModel.delete(id);
    } catch (error) {
      throw error;
    }
  }

  validateResumeData(data) {
    if (data.candidate_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.candidate_email)) {
        throw new Error('Invalid candidate email format');
      }
    }

    if (data.previous_salary !== undefined && data.previous_salary !== null) {
      const previousSalary = Number(data.previous_salary);
      if (Number.isNaN(previousSalary) || previousSalary < 0) {
        throw new Error('previous_salary must be a non-negative number');
      }
    }
  }

  async getSelectedResumes() {
    try {
      return await resumeModel.findSelectedCandidates();
    } catch (error) {
      throw new Error(`Failed to fetch selected resumes: ${error.message}`);
    }
  }
  
}

module.exports = new ResumeService();
