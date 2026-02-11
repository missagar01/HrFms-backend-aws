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
  constructor() {
    this.columnCache = new Map();
  }

  async hasColumn(client, tableName, columnName) {
    const cacheKey = `${tableName}.${columnName}`;
    if (this.columnCache.has(cacheKey)) return this.columnCache.get(cacheKey);

    const result = await client.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2) AS exists`,
      [tableName, columnName]
    );
    const exists = Boolean(result.rows[0]?.exists);
    this.columnCache.set(cacheKey, exists);
    return exists;
  }

  async fetchDeviceLogs(fromDate, toDate) {
    const logPromises = DEVICE_SERIALS.map(serial =>
      axios.get(DEVICE_API_URL, {
        params: { APIKey: API_KEY, SerialNumber: serial, FromDate: fromDate, ToDate: toDate }
      }).then(res => res.data).catch(err => {
        console.error(`Error fetching logs for device ${serial}:`, err.message);
        return [];
      })
    );
    const results = await Promise.all(logPromises);
    return results.flat();
  }

  async getDashboardStats() {
    const client = await pool.connect();
    try {
      // Parallelize Column Checks
      const checkPromises = [
        this.hasColumn(client, 'users', 'created_at'),
        this.hasColumn(client, 'users', 'updated_at'),
        this.hasColumn(client, 'leave_request', 'created_at'),
        this.hasColumn(client, 'request', 'created_at'),
        this.hasColumn(client, 'ticket_book', 'created_at'),
        this.hasColumn(client, 'resume_request', 'created_at'),
        this.hasColumn(client, 'plant_visitor', 'created_at')
      ];
      const [hEC, hEU, hLC, hRC, hTC, hResC, hVC] = await Promise.all(checkPromises);

      // Attendance API Request
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const logsPromise = this.fetchDeviceLogs(dateStr, dateStr);

      // Define optimized Queries
      const summaryLeftClause = hEU ? `COUNT(*) FILTER (WHERE status IS NOT NULL AND status::text ~* '${ATTRITION_PATTERN}' AND updated_at >= date_trunc('month', CURRENT_DATE))::int` : '0';

      const queries = {
        summary: `SELECT COUNT(*)::int AS total_employees, COUNT(*) FILTER (WHERE LOWER(status::text) = 'active')::int AS active_employees, COUNT(*) FILTER (WHERE status IS NOT NULL AND status::text ~* '${ATTRITION_PATTERN}')::int AS resigned_employees, ${summaryLeftClause} AS left_this_month FROM users`,
        status: `SELECT COALESCE(NULLIF(TRIM(status::text), ''), 'Unknown') AS status_label, COUNT(*)::int AS count FROM users GROUP BY 1 ORDER BY COUNT(*) DESC, status_label ASC`,
        hiring: hEC ? `SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS hired FROM users WHERE created_at IS NOT NULL AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months' GROUP BY 1 ORDER BY 1` : 'SELECT NULL AS month, 0 AS hired WHERE false',
        designation: `SELECT COALESCE(NULLIF(TRIM(designation::text), ''), 'Unassigned') AS designation, COUNT(*)::int AS employees FROM users GROUP BY 1 ORDER BY employees DESC, designation ASC LIMIT 10`,
        leaves: `SELECT COUNT(*)::int AS total_leaves, COUNT(*) FILTER (WHERE LOWER(request_status::text) = 'approved' OR LOWER(approved_by_status::text) = 'approved')::int AS approved_leaves, COUNT(*) FILTER (WHERE LOWER(request_status::text) = 'pending' OR (approved_by_status IS NULL AND request_status IS NULL))::int AS pending_leaves, COUNT(*) FILTER (WHERE LOWER(request_status::text) = 'rejected' OR LOWER(approved_by_status::text) = 'rejected')::int AS rejected_leaves, COUNT(*) FILTER (WHERE LOWER(hr_approval::text) = 'approved' OR LOWER(approval_hr::text) = 'approved')::int AS hr_approved FROM leave_request`,
        monthlyLeaves: hLC ? `SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS leaves FROM leave_request WHERE created_at IS NOT NULL AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months' GROUP BY 1 ORDER BY 1` : 'SELECT NULL AS month, 0 AS leaves WHERE false',
        travels: `SELECT COUNT(*)::int AS total_travels, COUNT(*) FILTER (WHERE LOWER(request_status::text) = 'approved')::int AS approved_travels, COUNT(*) FILTER (WHERE LOWER(request_status::text) = 'pending' OR request_status IS NULL)::int AS pending_travels, COUNT(*) FILTER (WHERE LOWER(request_status::text) = 'rejected')::int AS rejected_travels FROM request`,
        monthlyTravels: hRC ? `SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS travels FROM request WHERE created_at IS NOT NULL AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months' GROUP BY 1 ORDER BY 1` : 'SELECT NULL AS month, 0 AS travels WHERE false',
        tickets: `SELECT COUNT(*)::int AS total_tickets, COUNT(*) FILTER (WHERE LOWER(status::text) = 'booked' OR LOWER(status::text) = 'completed')::int AS booked_tickets, COUNT(*) FILTER (WHERE LOWER(status::text) = 'pending' OR status IS NULL)::int AS pending_tickets, COALESCE(SUM(total_amount), 0)::numeric AS total_amount FROM ticket_book`,
        monthlyTickets: hTC ? `SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS tickets, COALESCE(SUM(total_amount), 0)::numeric AS amount FROM ticket_book WHERE created_at IS NOT NULL AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months' GROUP BY 1 ORDER BY 1` : 'SELECT NULL AS month, 0 AS tickets, 0 AS amount WHERE false',
        resumes: `SELECT COUNT(*)::int AS total_candidates, COUNT(*) FILTER (WHERE LOWER(candidate_status::text) = 'selected')::int AS selected_candidates, COUNT(*) FILTER (WHERE LOWER(candidate_status::text) = 'pending' OR candidate_status IS NULL)::int AS pending_candidates, COUNT(*) FILTER (WHERE LOWER(candidate_status::text) = 'rejected')::int AS rejected_candidates, COUNT(*) FILTER (WHERE LOWER(joined_status::text) = 'joined' OR LOWER(joined_status::text) = 'yes')::int AS joined_candidates, COUNT(*) FILTER (WHERE interviewer_status IS NOT NULL)::int AS interviewed_candidates FROM resume_request`,
        monthlyResumes: hResC ? `SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS candidates FROM resume_request WHERE created_at IS NOT NULL AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months' GROUP BY 1 ORDER BY 1` : 'SELECT NULL AS month, 0 AS candidates WHERE false',
        visitors: `SELECT COUNT(*)::int AS total_visitors, COUNT(*) FILTER (WHERE LOWER(request_status::text) = 'approved')::int AS approved_visitors, COUNT(*) FILTER (WHERE LOWER(request_status::text) = 'pending' OR request_status IS NULL)::int AS pending_visitors, COUNT(*) FILTER (WHERE LOWER(request_status::text) = 'rejected')::int AS rejected_visitors FROM plant_visitor`,
        monthlyVisitors: hVC ? `SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS visitors FROM plant_visitor WHERE created_at IS NOT NULL AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months' GROUP BY 1 ORDER BY 1` : 'SELECT NULL AS month, 0 AS visitors WHERE false',
        activeEmpIDs: "SELECT employee_id FROM users WHERE LOWER(status::text) = 'active'"
      };

      // Execute DB Queries and API Calls IN PARALLEL
      const results = await Promise.all([
        client.query(queries.summary),
        client.query(queries.status),
        client.query(queries.hiring),
        client.query(queries.designation),
        client.query(queries.leaves),
        client.query(queries.monthlyLeaves),
        client.query(queries.travels),
        client.query(queries.monthlyTravels),
        client.query(queries.tickets),
        client.query(queries.monthlyTickets),
        client.query(queries.resumes),
        client.query(queries.monthlyResumes),
        client.query(queries.visitors),
        client.query(queries.monthlyVisitors),
        client.query(queries.activeEmpIDs),
        logsPromise
      ]);

      const [sRes, stRes, hRes, dRes, lRes, mlRes, tRes, mtRes, tkRes, mtkRes, rRes, mrRes, vRes, mvRes, actRes, allLogs] = results;

      // Attendance Processing
      const totalActive = actRes.rows.length;
      const activeCodes = actRes.rows.map(e => String(e.employee_id));
      const logsCodes = new Set(allLogs.filter(l => l && l.EmployeeCode).map(l => String(l.EmployeeCode)));
      const presentCount = activeCodes.filter(c => logsCodes.has(c)).length;

      const months = buildMonthWindow(MONTH_WINDOW);
      const hiringMap = new Map(hRes.rows.map(r => [r.month, r.hired]));
      const lMap = new Map(mlRes.rows.map(r => [r.month, r.leaves]));
      const tMap = new Map(mtRes.rows.map(r => [r.month, r.travels]));
      const tkMap = new Map(mtkRes.rows.map(r => [r.month, r.tickets]));
      const tkaMap = new Map(mtkRes.rows.map(r => [r.month, parseFloat(r.amount || 0)]));
      const rMap = new Map(mrRes.rows.map(r => [r.month, r.candidates]));
      const vMap = new Map(mvRes.rows.map(r => [r.month, r.visitors]));

      return {
        summary: { totalEmployees: sRes.rows[0].total_employees, activeEmployees: sRes.rows[0].active_employees, resignedEmployees: sRes.rows[0].resigned_employees, leftThisMonth: sRes.rows[0].left_this_month },
        leaveRequests: { total: lRes.rows[0].total_leaves, approved: lRes.rows[0].approved_leaves, pending: lRes.rows[0].pending_leaves, rejected: lRes.rows[0].rejected_leaves, hrApproved: lRes.rows[0].hr_approved },
        travelRequests: { total: tRes.rows[0].total_travels, approved: tRes.rows[0].approved_travels, pending: tRes.rows[0].pending_travels, rejected: tRes.rows[0].rejected_travels },
        tickets: { total: tkRes.rows[0].total_tickets, booked: tkRes.rows[0].booked_tickets, pending: tkRes.rows[0].pending_tickets, totalAmount: parseFloat(tkRes.rows[0].total_amount || 0) },
        resumes: { total: rRes.rows[0].total_candidates, selected: rRes.rows[0].selected_candidates, pending: rRes.rows[0].pending_candidates, rejected: rRes.rows[0].rejected_candidates, joined: rRes.rows[0].joined_candidates, interviewed: rRes.rows[0].interviewed_candidates },
        visitors: { total: vRes.rows[0].total_visitors, approved: vRes.rows[0].approved_visitors, pending: vRes.rows[0].pending_visitors, rejected: vRes.rows[0].rejected_visitors },
        statusDistribution: stRes.rows.map(r => ({ label: r.status_label, value: r.count })),
        monthlyHiringVsAttrition: months.map(m => ({ month: m.label, hired: hiringMap.get(m.key) || 0, left: 0 })),
        monthlyRequestTrends: months.map(m => ({ month: m.label, leaves: lMap.get(m.key) || 0, travels: tMap.get(m.key) || 0, tickets: tkMap.get(m.key) || 0, visitors: vMap.get(m.key) || 0 })),
        monthlyTicketRevenue: months.map(m => ({ month: m.label, amount: tkaMap.get(m.key) || 0 })),
        designationCounts: dRes.rows.map(r => ({ designation: r.designation, employees: r.employees })),
        attendance: { present: presentCount, absent: totalActive - presentCount, totalActive, date: dateStr }
      };
    } finally {
      client.release();
    }
  }

  async getEmployeeDashboardStats(userId, employeeId, monthStr) {
    const client = await pool.connect();
    try {
      let finalUserId = userId;
      if (!finalUserId) {
        const userRes = await client.query('SELECT id FROM users WHERE employee_id = $1', [employeeId]);
        finalUserId = userRes.rows[0]?.id;
      }

      const today = new Date();
      let startDate, endDate;
      if (monthStr && monthStr.includes('-')) {
        const parts = monthStr.split('-');
        startDate = new Date(parts[0], parts[1] - 1, 1);
        endDate = new Date(parts[0], parts[1], 0);
      } else {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      }

      const toS = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const fS = toS(startDate), fE = toS(endDate);

      // Start everything in parallel
      const [leaveRes, travelRes, ticketRes, visitRes, allLogs] = await Promise.all([
        client.query(`SELECT * FROM leave_request WHERE employee_id = $1 AND from_date BETWEEN $2 AND $3 ORDER BY from_date DESC`, [finalUserId, fS, fE]),
        client.query(`SELECT * FROM request WHERE employee_code = $1 AND from_date BETWEEN $2 AND $3 ORDER BY from_date DESC`, [employeeId, fS, fE]),
        client.query(`SELECT * FROM ticket_book WHERE (request_employee_code = $1 OR booked_employee_code = $1) AND created_at::date BETWEEN $2 AND $3 ORDER BY created_at DESC`, [employeeId, fS, fE]),
        client.query(`SELECT * FROM plant_visitor WHERE employee_code = $1 AND from_date BETWEEN $2 AND $3 ORDER BY from_date DESC`, [employeeId, fS, fE]),
        this.fetchDeviceLogs(fS, fE)
      ]);

      const empLogs = allLogs.filter(l => l && String(l.EmployeeCode) === String(employeeId));
      const getNorm = (s) => {
        if (!s) return '';
        let d = s.includes('T') ? s.split('T')[0] : (s.includes(' ') ? s.split(' ')[0] : s);
        if (d.includes('/')) {
          const p = d.split('/');
          if (p.length === 3) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        }
        if (d.includes('-')) {
          const p = d.split('-');
          if (p[0].length <= 2 && p[2].length === 4) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        }
        return d;
      };

      let present = 0, absent = 0;
      const attMap = {};
      const days = endDate.getDate();
      for (let d = 1; d <= days; d++) {
        const dt = new Date(startDate.getFullYear(), startDate.getMonth(), d);
        const ds = toS(dt);
        if (dt > today) { attMap[ds] = '-'; }
        else {
          const has = empLogs.some(l => getNorm(l.LogDate) === ds);
          attMap[ds] = has ? 'P' : 'A';
          if (has) present++; else absent++;
        }
      }

      return {
        attendance: { present, absent, totalWorkingDays: present + absent, details: attMap, month: monthStr || startDate.toISOString().slice(0, 7) },
        leaves: leaveRes.rows, travels: travelRes.rows, tickets: ticketRes.rows, visits: visitRes.rows
      };
    } finally {
      client.release();
    }
  }

  async getEmployeeDetails(employeeId) {
    const client = await pool.connect();
    try {
      const uRes = await client.query('SELECT * FROM users WHERE employee_id = $1', [employeeId]);
      if (uRes.rows.length === 0) throw new Error('Employee not found');
      const user = uRes.rows[0];

      const now = new Date();
      const sD = new Date(now.getFullYear(), now.getMonth(), 1);
      const eD = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const toS = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      // Parallel Fetch
      const [lRes, tRes, tkRes, vRes, allLogs] = await Promise.all([
        client.query('SELECT * FROM leave_request WHERE employee_id = $1 ORDER BY from_date DESC', [user.id]),
        client.query('SELECT * FROM request WHERE employee_code = $1 ORDER BY from_date DESC', [employeeId]),
        client.query('SELECT * FROM ticket_book WHERE request_employee_code = $1 OR booked_employee_code = $1 ORDER BY created_at DESC', [employeeId]),
        client.query('SELECT * FROM plant_visitor WHERE employee_code = $1 ORDER BY from_date DESC', [employeeId]),
        this.fetchDeviceLogs(toS(sD), toS(eD))
      ]);

      const empLogs = allLogs.filter(l => l && String(l.EmployeeCode) === String(employeeId));
      const getNorm = (s) => uRes.rows[0] ? (s.includes('T') ? s.split('T')[0] : (s.includes(' ') ? s.split(' ')[0] : s)) : ''; // Simple mock norm

      let p = 0, a = 0;
      const attMap = {};
      for (let d = 1; d <= eD.getDate(); d++) {
        const dt = new Date(sD.getFullYear(), sD.getMonth(), d);
        const ds = toS(dt);
        if (dt <= now) {
          const has = empLogs.some(l => {
            const nd = l.LogDate.includes('T') ? l.LogDate.split('T')[0] : (l.LogDate.includes(' ') ? l.LogDate.split(' ')[0] : l.LogDate);
            return nd === ds || (nd.includes('/') && nd.split('/').reverse().join('-') === ds);
          });
          if (has) { p++; attMap[ds] = 'P'; } else { a++; attMap[ds] = 'A'; }
        }
      }

      return {
        profile: user,
        attendanceSummary: { month: new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(now), present: p, absent: a, total: p + a, details: attMap },
        leaves: lRes.rows, travels: tRes.rows, tickets: tkRes.rows, visits: vRes.rows
      };
    } finally {
      client.release();
    }
  }
}

module.exports = new DashboardService();
