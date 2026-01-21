const pool = require('../config/db');
const axios = require('axios');

const API_KEY = '361011012609';
const DEVICE_SERIALS = ['E03C1CB36042AA02', 'E03C1CB34D83AA02'];
const DEVICE_API_URL = 'http://139.167.179.192:90/api/v2/WebAPI/GetDeviceLogs';

const MONTH_WINDOW = 6;
const ATTRITION_PATTERN = 'resign|left|terminated|separate';

function buildMonthWindow(count) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  });

  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = formatter.format(date);
    months.push({ key, label });
  }
  return months;
}

class DashboardService {
  async hasColumn(client, tableName, columnName) {
    const result = await client.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = $1
            AND column_name = $2
        ) AS exists
      `,
      [tableName, columnName]
    );
    return Boolean(result.rows[0]?.exists);
  }

  async getDashboardStats() {
    const client = await pool.connect();

    try {
      // Check for required columns
      const hasEmployeeCreatedAt = await this.hasColumn(client, 'employees', 'created_at');
      const hasEmployeeUpdatedAt = await this.hasColumn(client, 'employees', 'updated_at');
      const hasLeaveCreatedAt = await this.hasColumn(client, 'leave_request', 'created_at');
      const hasRequestCreatedAt = await this.hasColumn(client, 'request', 'created_at');
      const hasTicketCreatedAt = await this.hasColumn(client, 'ticket_book', 'created_at');
      const hasResumeCreatedAt = await this.hasColumn(client, 'resume', 'created_at');
      const hasVisitorCreatedAt = await this.hasColumn(client, 'plant_visitor', 'created_at');

      // ========== EMPLOYEE STATS ==========
      const summaryLeftThisMonthClause = hasEmployeeUpdatedAt
        ? `
            COUNT(*) FILTER (
              WHERE status IS NOT NULL
                AND status ~* '${ATTRITION_PATTERN}'
                AND updated_at >= date_trunc('month', CURRENT_DATE)
            )::int
          `
        : '0';

      const summaryQuery = `
        SELECT
          COUNT(*)::int AS total_employees,
          COUNT(*) FILTER (WHERE LOWER(status) = 'active')::int AS active_employees,
          COUNT(*) FILTER (
            WHERE status IS NOT NULL
              AND status ~* '${ATTRITION_PATTERN}'
          )::int AS resigned_employees,
          ${summaryLeftThisMonthClause} AS left_this_month
        FROM employees
      `;

      const statusDistributionQuery = `
        SELECT
          COALESCE(NULLIF(TRIM(status), ''), 'Unknown') AS status_label,
          COUNT(*)::int AS count
        FROM employees
        GROUP BY 1
        ORDER BY COUNT(*) DESC, status_label ASC
      `;

      const monthlyHiringQuery = hasEmployeeCreatedAt ? `
        SELECT
          TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS hired
        FROM employees
        WHERE created_at IS NOT NULL
          AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months'
        GROUP BY 1
        ORDER BY 1
      ` : 'SELECT NULL AS month, 0 AS hired WHERE false';

      const designationQuery = `
        SELECT
          COALESCE(NULLIF(TRIM(designation), ''), 'Unassigned') AS designation,
          COUNT(*)::int AS employees
        FROM employees
        GROUP BY 1
        ORDER BY employees DESC, designation ASC
        LIMIT 10
      `;

      // ========== LEAVE REQUEST STATS ==========
      const leaveStatsQuery = `
        SELECT
          COUNT(*)::int AS total_leaves,
          COUNT(*) FILTER (WHERE LOWER(request_status) = 'approved' OR LOWER(approved_by_status) = 'approved')::int AS approved_leaves,
          COUNT(*) FILTER (WHERE LOWER(request_status) = 'pending' OR (approved_by_status IS NULL AND request_status IS NULL))::int AS pending_leaves,
          COUNT(*) FILTER (WHERE LOWER(request_status) = 'rejected' OR LOWER(approved_by_status) = 'rejected')::int AS rejected_leaves,
          COUNT(*) FILTER (WHERE LOWER(hr_approval) = 'approved' OR LOWER(approval_hr) = 'approved')::int AS hr_approved
        FROM leave_request
      `;

      const monthlyLeaveQuery = hasLeaveCreatedAt ? `
        SELECT
          TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS leaves
        FROM leave_request
        WHERE created_at IS NOT NULL
          AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months'
        GROUP BY 1
        ORDER BY 1
      ` : 'SELECT NULL AS month, 0 AS leaves WHERE false';

      // ========== TRAVEL REQUEST STATS ==========
      const travelStatsQuery = `
        SELECT
          COUNT(*)::int AS total_travels,
          COUNT(*) FILTER (WHERE LOWER(request_status) = 'approved')::int AS approved_travels,
          COUNT(*) FILTER (WHERE LOWER(request_status) = 'pending' OR request_status IS NULL)::int AS pending_travels,
          COUNT(*) FILTER (WHERE LOWER(request_status) = 'rejected')::int AS rejected_travels
        FROM request
      `;

      const monthlyTravelQuery = hasRequestCreatedAt ? `
        SELECT
          TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS travels
        FROM request
        WHERE created_at IS NOT NULL
          AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months'
        GROUP BY 1
        ORDER BY 1
      ` : 'SELECT NULL AS month, 0 AS travels WHERE false';

      // ========== TICKET STATS ==========
      const ticketStatsQuery = `
        SELECT
          COUNT(*)::int AS total_tickets,
          COUNT(*) FILTER (WHERE LOWER(status) = 'booked' OR LOWER(status) = 'completed')::int AS booked_tickets,
          COUNT(*) FILTER (WHERE LOWER(status) = 'pending' OR status IS NULL)::int AS pending_tickets,
          COALESCE(SUM(total_amount), 0)::numeric AS total_amount
        FROM ticket_book
      `;

      const monthlyTicketQuery = hasTicketCreatedAt ? `
        SELECT
          TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS tickets,
          COALESCE(SUM(total_amount), 0)::numeric AS amount
        FROM ticket_book
        WHERE created_at IS NOT NULL
          AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months'
        GROUP BY 1
        ORDER BY 1
      ` : 'SELECT NULL AS month, 0 AS tickets, 0 AS amount WHERE false';

      // ========== RESUME/CANDIDATE STATS ==========
      const resumeStatsQuery = `
        SELECT
          COUNT(*)::int AS total_candidates,
          COUNT(*) FILTER (WHERE LOWER(candidate_status) = 'selected')::int AS selected_candidates,
          COUNT(*) FILTER (WHERE LOWER(candidate_status) = 'pending' OR candidate_status IS NULL)::int AS pending_candidates,
          COUNT(*) FILTER (WHERE LOWER(candidate_status) = 'rejected')::int AS rejected_candidates,
          COUNT(*) FILTER (WHERE LOWER(joined_status) = 'joined' OR LOWER(joined_status) = 'yes')::int AS joined_candidates,
          COUNT(*) FILTER (WHERE interviewer_status IS NOT NULL)::int AS interviewed_candidates
        FROM resume
      `;

      const monthlyResumeQuery = hasResumeCreatedAt ? `
        SELECT
          TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS candidates
        FROM resume
        WHERE created_at IS NOT NULL
          AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months'
        GROUP BY 1
        ORDER BY 1
      ` : 'SELECT NULL AS month, 0 AS candidates WHERE false';

      // ========== PLANT VISITOR STATS ==========
      const visitorStatsQuery = `
        SELECT
          COUNT(*)::int AS total_visitors,
          COUNT(*) FILTER (WHERE LOWER(request_status) = 'approved')::int AS approved_visitors,
          COUNT(*) FILTER (WHERE LOWER(request_status) = 'pending' OR request_status IS NULL)::int AS pending_visitors,
          COUNT(*) FILTER (WHERE LOWER(request_status) = 'rejected')::int AS rejected_visitors
        FROM plant_visitor
      `;

      const monthlyVisitorQuery = hasVisitorCreatedAt ? `
        SELECT
          TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS visitors
        FROM plant_visitor
        WHERE created_at IS NOT NULL
          AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months'
        GROUP BY 1
        ORDER BY 1
      ` : 'SELECT NULL AS month, 0 AS visitors WHERE false';

      // Execute all queries
      const results = await Promise.all([
        client.query(summaryQuery),
        client.query(statusDistributionQuery),
        hasEmployeeCreatedAt ? client.query(monthlyHiringQuery) : Promise.resolve({ rows: [] }),
        client.query(designationQuery),
        client.query(leaveStatsQuery),
        hasLeaveCreatedAt ? client.query(monthlyLeaveQuery) : Promise.resolve({ rows: [] }),
        client.query(travelStatsQuery),
        hasRequestCreatedAt ? client.query(monthlyTravelQuery) : Promise.resolve({ rows: [] }),
        client.query(ticketStatsQuery),
        hasTicketCreatedAt ? client.query(monthlyTicketQuery) : Promise.resolve({ rows: [] }),
        client.query(resumeStatsQuery),
        hasResumeCreatedAt ? client.query(monthlyResumeQuery) : Promise.resolve({ rows: [] }),
        client.query(visitorStatsQuery),
        hasVisitorCreatedAt ? client.query(monthlyVisitorQuery) : Promise.resolve({ rows: [] }),
        client.query("SELECT employee_code FROM employees WHERE LOWER(status) = 'active'")
      ]);

      const [
        summaryResult,
        statusResult,
        hiringResult,
        designationResult,
        leaveStatsResult,
        monthlyLeaveResult,
        travelStatsResult,
        monthlyTravelResult,
        ticketStatsResult,
        monthlyTicketResult,
        resumeStatsResult,
        monthlyResumeResult,
        visitorStatsResult,
        monthlyVisitorResult
      ] = results;

      // Calculate Attendance Stats
      let presentCount = 0;
      let absentCount = 0;
      const totalActiveEmployees = (results[14] && results[14].rows) ? results[14].rows.length : 0; // results[14] is the active employees query
      const activeEmployeeCodes = (results[14] && results[14].rows) ? results[14].rows.map(e => e.employee_code) : [];

      try {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

        // Fetch logs from all devices
        const logPromises = DEVICE_SERIALS.map(serial =>
          axios.get(DEVICE_API_URL, {
            params: {
              APIKey: API_KEY,
              SerialNumber: serial,
              FromDate: dateStr,
              ToDate: dateStr
            }
          }).then(res => res.data).catch(err => {
            console.error(`Error fetching logs for device ${serial}:`, err.message);
            return [];
          })
        );

        const logsResults = await Promise.all(logPromises);
        // logsResults is an array of arrays (or whatever the API returns)
        // The API returns the list directly according to the user prompt.

        const allLogs = logsResults.flat();

        // Get unique employee codes from logs
        const PresentEmployeeCodes = new Set(
          allLogs
            .filter(log => log && log.EmployeeCode)
            .map(log => log.EmployeeCode)
        );

        // Calculate Present: Count of Active Employees who are in the logs
        // We filter activeEmployeeCodes to see which ones are in PresentEmployeeCodes
        presentCount = activeEmployeeCodes.filter(code => PresentEmployeeCodes.has(code)).length;

        // Absent: Total Active - Present
        absentCount = totalActiveEmployees - presentCount;

      } catch (attendanceError) {
        console.error('Error calculating attendance stats:', attendanceError);
        // Fallback to 0 if error, or just continue
      }

      // Process results
      const summaryRow = summaryResult.rows[0] || {
        total_employees: 0,
        active_employees: 0,
        resigned_employees: 0,
        left_this_month: 0
      };

      const leaveStatsRow = leaveStatsResult.rows[0] || {
        total_leaves: 0,
        approved_leaves: 0,
        pending_leaves: 0,
        rejected_leaves: 0,
        hr_approved: 0
      };

      const travelStatsRow = travelStatsResult.rows[0] || {
        total_travels: 0,
        approved_travels: 0,
        pending_travels: 0,
        rejected_travels: 0
      };

      const ticketStatsRow = ticketStatsResult.rows[0] || {
        total_tickets: 0,
        booked_tickets: 0,
        pending_tickets: 0,
        total_amount: 0
      };

      const resumeStatsRow = resumeStatsResult.rows[0] || {
        total_candidates: 0,
        selected_candidates: 0,
        pending_candidates: 0,
        rejected_candidates: 0,
        joined_candidates: 0,
        interviewed_candidates: 0
      };

      const visitorStatsRow = visitorStatsResult.rows[0] || {
        total_visitors: 0,
        approved_visitors: 0,
        pending_visitors: 0,
        rejected_visitors: 0
      };

      // Build monthly data
      const months = buildMonthWindow(MONTH_WINDOW);
      const hiringMap = new Map(hiringResult.rows.map((row) => [row.month, row.hired]));
      const leaveMap = new Map(monthlyLeaveResult.rows.map((row) => [row.month, row.leaves]));
      const travelMap = new Map(monthlyTravelResult.rows.map((row) => [row.month, row.travels]));
      const ticketMap = new Map(monthlyTicketResult.rows.map((row) => [row.month, row.tickets]));
      const ticketAmountMap = new Map(monthlyTicketResult.rows.map((row) => [row.month, parseFloat(row.amount || 0)]));
      const resumeMap = new Map(monthlyResumeResult.rows.map((row) => [row.month, row.candidates]));
      const visitorMap = new Map(monthlyVisitorResult.rows.map((row) => [row.month, row.visitors]));

      const monthlyHiringVsAttrition = months.map(({ key, label }) => ({
        month: label,
        hired: hiringMap.get(key) || 0,
        left: 0 // Can be calculated from employee updates if needed
      }));

      const monthlyRequestTrends = months.map(({ key, label }) => ({
        month: label,
        leaves: leaveMap.get(key) || 0,
        travels: travelMap.get(key) || 0,
        tickets: ticketMap.get(key) || 0,
        visitors: visitorMap.get(key) || 0
      }));

      const monthlyTicketRevenue = months.map(({ key, label }) => ({
        month: label,
        amount: ticketAmountMap.get(key) || 0
      }));

      return {
        summary: {
          totalEmployees: summaryRow.total_employees,
          activeEmployees: summaryRow.active_employees,
          resignedEmployees: summaryRow.resigned_employees,
          leftThisMonth: summaryRow.left_this_month
        },
        leaveRequests: {
          total: leaveStatsRow.total_leaves,
          approved: leaveStatsRow.approved_leaves,
          pending: leaveStatsRow.pending_leaves,
          rejected: leaveStatsRow.rejected_leaves,
          hrApproved: leaveStatsRow.hr_approved
        },
        travelRequests: {
          total: travelStatsRow.total_travels,
          approved: travelStatsRow.approved_travels,
          pending: travelStatsRow.pending_travels,
          rejected: travelStatsRow.rejected_travels
        },
        tickets: {
          total: ticketStatsRow.total_tickets,
          booked: ticketStatsRow.booked_tickets,
          pending: ticketStatsRow.pending_tickets,
          totalAmount: parseFloat(ticketStatsRow.total_amount || 0)
        },
        resumes: {
          total: resumeStatsRow.total_candidates,
          selected: resumeStatsRow.selected_candidates,
          pending: resumeStatsRow.pending_candidates,
          rejected: resumeStatsRow.rejected_candidates,
          joined: resumeStatsRow.joined_candidates,
          interviewed: resumeStatsRow.interviewed_candidates
        },
        visitors: {
          total: visitorStatsRow.total_visitors,
          approved: visitorStatsRow.approved_visitors,
          pending: visitorStatsRow.pending_visitors,
          rejected: visitorStatsRow.rejected_visitors
        },
        statusDistribution: statusResult.rows.map((row) => ({
          label: row.status_label,
          value: row.count
        })),
        monthlyHiringVsAttrition,
        monthlyRequestTrends,
        monthlyTicketRevenue,
        designationCounts: designationResult.rows.map((row) => ({
          designation: row.designation,
          employees: row.employees
        })),
        attendance: {
          present: presentCount,
          absent: absentCount,
          totalActive: totalActiveEmployees,
          date: new Date().toISOString().split('T')[0]
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

module.exports = new DashboardService();
