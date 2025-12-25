const pool = require('../config/db');

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
  async hasEmployeeColumn(client, columnName) {
    const result = await client.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'employees'
            AND column_name = $1
        ) AS exists
      `,
      [columnName]
    );
    return Boolean(result.rows[0]?.exists);
  }

  async getDashboardStats() {
    const client = await pool.connect();

    try {
      const hasCreatedAt = await this.hasEmployeeColumn(client, 'created_at');
      const hasUpdatedAt = await this.hasEmployeeColumn(client, 'updated_at');

      const summaryLeftThisMonthClause = hasUpdatedAt
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

      const monthlyHiringQuery = `
        SELECT
          TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS hired
        FROM employees
        WHERE created_at IS NOT NULL
          AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months'
        GROUP BY 1
        ORDER BY 1
      `;

      const monthlyAttritionQuery = `
        SELECT
          TO_CHAR(date_trunc('month', updated_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS left
        FROM employees
        WHERE status IS NOT NULL
          AND status ~* '${ATTRITION_PATTERN}'
          AND updated_at IS NOT NULL
          AND updated_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months'
        GROUP BY 1
        ORDER BY 1
      `;

      const designationQuery = `
        SELECT
          COALESCE(NULLIF(TRIM(designation), ''), 'Unassigned') AS designation,
          COUNT(*)::int AS employees
        FROM employees
        GROUP BY 1
        ORDER BY employees DESC, designation ASC
      `;

      const hiringResult = hasCreatedAt
        ? await client.query(monthlyHiringQuery)
        : { rows: [] };
      const attritionResult = hasUpdatedAt
          ? await client.query(monthlyAttritionQuery)
          : { rows: [] };
      const summaryResult = await client.query(summaryQuery);
      const statusResult = await client.query(statusDistributionQuery);
      const designationResult = await client.query(designationQuery);

      const summaryRow = summaryResult.rows[0] || {
        total_employees: 0,
        active_employees: 0,
        resigned_employees: 0,
        left_this_month: 0
      };

      const months = buildMonthWindow(MONTH_WINDOW);
      const hiringMap = new Map(hiringResult.rows.map((row) => [row.month, row.hired]));
      const attritionMap = new Map(attritionResult.rows.map((row) => [row.month, row.left]));

      const monthlyHiringVsAttrition = months.map(({ key, label }) => ({
        month: label,
        hired: hiringMap.get(key) || 0,
        left: attritionMap.get(key) || 0
      }));

      const statusDistribution = statusResult.rows.map((row) => ({
        label: row.status_label,
        value: row.count
      }));

      const designationCounts = designationResult.rows.map((row) => ({
        designation: row.designation,
        employees: row.employees
      }));

      return {
        summary: {
          totalEmployees: summaryRow.total_employees,
          activeEmployees: summaryRow.active_employees,
          resignedEmployees: summaryRow.resigned_employees,
          leftThisMonth: summaryRow.left_this_month
        },
        statusDistribution,
        monthlyHiringVsAttrition,
        designationCounts
      };
    } catch (error) {
      throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

module.exports = new DashboardService();
