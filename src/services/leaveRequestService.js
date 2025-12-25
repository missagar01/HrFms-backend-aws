const leaveRequestModel = require('../models/leaveRequestModel');

class LeaveRequestService {
  async getAllLeaveRequests() {
    try {
      return await leaveRequestModel.findAll();
    } catch (error) {
      throw new Error(`Failed to fetch leave requests: ${error.message}`);
    }
  }

  async getLeaveRequestById(id) {
    try {
      const leaveRequest = await leaveRequestModel.findById(id);
      if (!leaveRequest) {
        throw new Error('Leave request not found');
      }
      return leaveRequest;
    } catch (error) {
      throw error;
    }
  }

  async getLeaveRequestsByApprovedStatus(status) {
    if (!status) {
      throw new Error('approved_by_status is required');
    }
    try {
      return await leaveRequestModel.findByApprovedStatus(status);
    } catch (error) {
      throw new Error(`Failed to fetch leave requests: ${error.message}`);
    }
  }

  async createLeaveRequest(data) {
    try {
      this.validateLeaveRequestData(data);
      return await leaveRequestModel.create(data);
    } catch (error) {
      throw new Error(`Failed to create leave request: ${error.message}`);
    }
  }

  async updateLeaveRequest(id, data) {
    try {
      const existingLeaveRequest = await leaveRequestModel.findById(id);
      if (!existingLeaveRequest) {
        throw new Error('Leave request not found');
      }
      this.validateLeaveRequestData({ ...existingLeaveRequest, ...data });
      return await leaveRequestModel.update(id, data);
    } catch (error) {
      throw error;
    }
  }

  async deleteLeaveRequest(id) {
    try {
      const existingLeaveRequest = await leaveRequestModel.findById(id);
      if (!existingLeaveRequest) {
        throw new Error('Leave request not found');
      }
      return await leaveRequestModel.delete(id);
    } catch (error) {
      throw error;
    }
  }

  validateLeaveRequestData(data) {
    if (data.employee_id && !Number.isInteger(Number(data.employee_id))) {
      throw new Error('employee_id must be an integer');
    }

    if (data.from_date && data.to_date) {
      const fromDate = new Date(data.from_date);
      const toDate = new Date(data.to_date);
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        throw new Error('from_date and to_date must be valid dates');
      }
      if (fromDate > toDate) {
        throw new Error('from_date cannot be after to_date');
      }
    }
  }
}

module.exports = new LeaveRequestService();
