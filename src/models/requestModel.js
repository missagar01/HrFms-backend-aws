const pool = require('../config/db');

class RequestModel {
  async findAll() {
    const query = `
      SELECT * FROM request 
      ORDER BY created_at ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async findById(id) {
    const query = 'SELECT * FROM request WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async create(data) {
    const query = `
      WITH next_no AS (
        SELECT 'T-' || LPAD((COALESCE(MAX(id), 0) + 1)::text, 4, '0') AS request_no
        FROM request
      )
      INSERT INTO request (
        request_no,
        employee_code,
        person_name,
        type_of_travel,
        reason_for_travel,
        no_of_person,
        from_date,
        to_date,
        departure_date,
        requester_name,
        requester_designation,
        requester_department,
        request_for,
        request_quantity,
        experience,
        education,
        remarks,
        request_status
      )
      SELECT
        next_no.request_no,
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16, $17
      FROM next_no
      RETURNING *
    `;
    
    const values = [
      data.employee_code || null,
      data.person_name || null,
      data.type_of_travel || null,
      data.reason_for_travel || null,
      data.no_of_person !== null && data.no_of_person !== undefined ? data.no_of_person : null,
      data.from_date || null,
      data.to_date || null,
      data.departure_date || null,
      data.requester_name || null,
      data.requester_designation || null,
      data.requester_department || null,
      data.request_for || null,
      data.request_quantity !== null && data.request_quantity !== undefined ? data.request_quantity : null,
      data.experience || null,
      data.education || null,
      data.remarks || null,
      data.request_status || 'Open'
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async update(id, data) {
    const query = `
      UPDATE request
      SET 
        employee_code = COALESCE($1, employee_code),
        person_name = COALESCE($2, person_name),
        type_of_travel = COALESCE($3, type_of_travel),
        reason_for_travel = COALESCE($4, reason_for_travel),
        no_of_person = COALESCE($5, no_of_person),
        from_date = COALESCE($6, from_date),
        to_date = COALESCE($7, to_date),
        departure_date = COALESCE($8, departure_date),
        requester_name = COALESCE($9, requester_name),
        requester_designation = COALESCE($10, requester_designation),
        requester_department = COALESCE($11, requester_department),
        request_for = COALESCE($12, request_for),
        request_quantity = COALESCE($13, request_quantity),
        experience = COALESCE($14, experience),
        education = COALESCE($15, education),
        remarks = COALESCE($16, remarks),
        request_status = COALESCE($17, request_status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING *
    `;

    const values = [
      data.employee_code,
      data.person_name,
      data.type_of_travel,
      data.reason_for_travel,
      data.no_of_person,
      data.from_date,
      data.to_date,
      data.departure_date,
      data.requester_name,
      data.requester_designation,
      data.requester_department,
      data.request_for,
      data.request_quantity,
      data.experience,
      data.education,
      data.remarks,
      data.request_status,
      id
    ];

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  async delete(id) {
    const query = 'DELETE FROM request WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = new RequestModel();
