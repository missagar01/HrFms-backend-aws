const { Pool } = require("pg"); 
 
const sslEnabled = String(process.env.PG_SSL || "").toLowerCase() === "true"; 
 
const pool = new Pool({ 
  host: process.env.PG_HOST, 
  port: Number(process.env.PG_PORT || 5432), 
  user: process.env.PG_USER, 
  password: process.env.PG_PASSWORD, 
  database: process.env.PG_DATABASE, 
  ssl: sslEnabled ? { rejectUnauthorized: false } : false 
}); 
 
module.exports = pool;
