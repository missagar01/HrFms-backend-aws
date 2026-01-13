const pool = require("../config/db"); 

const resolvePageAccessInput = (data) =>
  data?.page_access ??
  data?.pageAccess ??
  data?.Page_Access ??
  data?.PageAccess ??
  null;

const serializePageAccess = (value) => {
  if (value == null || value === undefined) {
    return null;
  }

  // If it's already a JSON string, return it as-is
  if (typeof value === "string") {
    // Check if it's a valid JSON string (array or object)
    try {
      const parsed = JSON.parse(value);
      // If it parses successfully, re-stringify to ensure consistency
      return JSON.stringify(parsed);
    } catch {
      // If it's not valid JSON, treat as a single string value and wrap in array
      return JSON.stringify([value]);
    }
  }

  // If it's an array or object, stringify it
  if (Array.isArray(value) || typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }

  // If it's a single value (string, number, etc.), wrap it in an array
  return JSON.stringify([value]);
};

const deserializePageAccess = (value) => {
  if (value == null || value === undefined || value === '') {
    return [];
  }

  if (typeof value !== "string") {
    // If it's already an array, return it
    if (Array.isArray(value)) {
      return value;
    }
    // If it's an object, return as array
    if (typeof value === "object") {
      return value;
    }
    // Otherwise wrap in array
    return [value];
  }

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(value);
    // Ensure we return an array
    if (Array.isArray(parsed)) {
      return parsed;
    }
    // If parsed value is an object, return as-is
    if (typeof parsed === "object") {
      return parsed;
    }
    // If it's a single value, wrap in array
    return [parsed];
  } catch {
    // If parsing fails, treat as comma-separated string or single value
    if (value.includes(',')) {
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
    // Single value, wrap in array
    return [value];
  }
};

const hydrateEmployeePageAccess = (employee) => {
  if (!employee) {
    return null;
  }
  return {
    ...employee,
    page_access: deserializePageAccess(employee.page_access),
  };
};
 
async function getAll() { 
  const result = await pool.query("SELECT * FROM employees ORDER BY id ASC"); 
  return result.rows.map(hydrateEmployeePageAccess); 
} 

async function getById(id) { 
  const result = await pool.query("SELECT * FROM employees WHERE id = $1", [id]); 
  return hydrateEmployeePageAccess(result.rows[0]); 
} 

async function create(data) { 
  const query = ` 
    INSERT INTO employees ( 
      employee_code, 
      employee_name, 
      email, 
      mobile_number, 
      page_access,
      department, 
      designation, 
      role, 
      status, 
      password,
      profile_img,
      document_img
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) 
    RETURNING * 
  `; 

  const pageAccessInput = resolvePageAccessInput(data);
  const serializedPageAccess = serializePageAccess(pageAccessInput);
  
  // Debug logging
  console.log('Create Employee - page_access input:', pageAccessInput);
  console.log('Create Employee - serialized page_access:', serializedPageAccess);
  console.log('Create Employee - data keys:', Object.keys(data));

  const values = [ 
    data.employee_code, 
    data.employee_name, 
    data.email, 
    data.mobile_number, 
    serializedPageAccess,
    data.department, 
    data.designation, 
    data.role, 
    data.status, 
    data.password,
    data.profile_img || null,
    data.document_img || null
  ]; 

  const result = await pool.query(query, values); 
  const created = hydrateEmployeePageAccess(result.rows[0]);
  console.log('Create Employee - Result page_access:', created?.page_access);
  return created; 
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
      password = COALESCE(NULLIF($9, ''), password),
      page_access = $10,
      profile_img = COALESCE($11, profile_img),
      document_img = COALESCE($12, document_img)
    WHERE id = $13 
    RETURNING * 
  `; 

  const pageAccessInput = resolvePageAccessInput(data);
  const serializedPageAccess = serializePageAccess(pageAccessInput);
  
  // Debug logging
  console.log('Update Employee - ID:', id);
  console.log('Update Employee - page_access input:', pageAccessInput);
  console.log('Update Employee - serialized page_access:', serializedPageAccess);
  console.log('Update Employee - data keys:', Object.keys(data));

  const values = [ 
    data.employee_code, 
    data.employee_name, 
    data.email, 
    data.mobile_number, 
    data.department, 
    data.designation, 
    data.role, 
    data.status, 
    data.password || null, 
    serializedPageAccess,
    data.profile_img !== undefined ? data.profile_img : null,
    data.document_img !== undefined ? data.document_img : null,
    id 
  ]; 

  const result = await pool.query(query, values); 
  const updated = hydrateEmployeePageAccess(result.rows[0]);
  console.log('Update Employee - Result page_access:', updated?.page_access);
  return updated; 
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
  return hydrateEmployeePageAccess(result.rows[0]);
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
