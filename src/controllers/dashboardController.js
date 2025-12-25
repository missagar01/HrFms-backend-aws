const dashboardService = require('../services/dashboardService');

class DashboardController {
  async getDashboardData(req, res, next) {
    try {
      const data = await dashboardService.getDashboardStats();
      return res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new DashboardController();
