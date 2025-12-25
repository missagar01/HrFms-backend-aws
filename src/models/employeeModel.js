const pool = require("../config/db"); 
 
async function getAll() { 
  const result = await pool.query("SELECT * FROM employees ORDER BY id ASC"); 
  return result.rows; 
} 
 
async function getById(id) { 
  const result = await pool.query("SELECT * FROM employees WHERE id = $1", [id]); 
  return result.rows[0] || null; 
} 
 
async function create(data) { 
  const query = ` 
    INSERT INTO employees ( 
      employee_code, 
      employee_name, 
      email, 
      mobile_number, 
      department, 
      designation, 
      role, 
      status, 
      password 
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) 
    RETURNING * 
  `; 
 
  const values = [ 
    data.employee_code, 
    data.employee_name, 
    data.email, 
    data.mobile_number, 
    data.department, 
    data.designation, 
    data.role, 
    data.status, 
    data.password 
  ]; 
 
  const result = await pool.query(query, values); 
  return result.rows[0]; 
}
 
async function update(id, data) { 
  const query = ` 
    UPDATE employees 
    SET 
      employee_code = $1, 
      employee_name = $2, 
      email = $3, 
      mobile_number = $4, 
      department = $5, 
      designation = $6, 
      role = $7, 
      status = $8, 
      password = $9 
    WHERE id = $10 
    RETURNING * 
  `; 
 
  const values = [ 
    data.employee_code, 
    data.employee_name, 
    data.email, 
    data.mobile_number, 
    data.department, 
    data.designation, 
    data.role, 
    data.status, 
    data.password, 
    id 
  ]; 
 
  const result = await pool.query(query, values); 
  return result.rows[0] || null; 
}
 
async function remove(id) { 
  const result = await pool.query("DELETE FROM employees WHERE id = $1 RETURNING *", [id]); 
  return result.rows[0] || null; 
} 

async function getByCredentials(employeeCode, password) {
  const result = await pool.query(
    "SELECT * FROM employees WHERE employee_code = $1 AND password = $2",
    [employeeCode, password]
  );
  return result.rows[0] || null;
}

async function getDistinctDepartments() {
  const result = await pool.query(
    "SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department != '' ORDER BY department"
  );
  return result.rows.map(row => row.department);
}

async function getDistinctDesignations() {
  const result = await pool.query(
    "SELECT DISTINCT designation FROM employees WHERE designation IS NOT NULL AND designation != '' ORDER BY designation"
  );
  return result.rows.map(row => row.designation);
}
 
module.exports = { 
  getAll, 
  getById, 
  create, 
  update, 
  remove,
  getByCredentials,
  getDistinctDepartments,
  getDistinctDesignations
};
