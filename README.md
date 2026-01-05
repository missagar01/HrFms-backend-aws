# TravelFMS Backend

Production-ready Node.js + Express + PostgreSQL backend with proper MVC architecture.

## Architecture

This backend follows a clean MVC pattern with separation of concerns:

- **Routes**: Define API endpoints
- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic layer
- **Models**: Database operations
- **Middleware**: Error handling, validation, etc.

## Features

- ✅ Proper MVC architecture with Services layer
- ✅ Image upload support (Multer)
- ✅ Error handling middleware
- ✅ CORS support
- ✅ Security headers (Helmet)
- ✅ Request validation
- ✅ Image URLs for frontend display
- ✅ Production-ready structure

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:
   ```env
   NODE_ENV=development
   PORT=3005
   BASE_URL=http://localhost:3005
   CORS_ORIGIN=*

   # Database Configuration
   PG_HOST=your-database-host
   PG_PORT=5432
   PG_USER=postgres
   PG_PASSWORD=your-password
   PG_DATABASE=Travelfms
   PG_SSL=true
   ```

3. Create database tables:
   ```sql
   CREATE TABLE request (
       id SERIAL PRIMARY KEY,
       person_name VARCHAR(255),
       request_no VARCHAR(100),
       type_of_travel VARCHAR(100),
       reason_for_travel TEXT,
       no_of_person INT,
       from_date DATE,
       to_date DATE,
       departure_date DATE,
       requester_name VARCHAR(255),
       requester_designation VARCHAR(255),
       requester_department VARCHAR(255),
       request_for VARCHAR(255),
       request_quantity INTEGER,
       experience VARCHAR(100),
       education VARCHAR(255),
       remarks TEXT,
       request_status VARCHAR(50),
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE ticket_book (
       id SERIAL PRIMARY KEY,
       bill_number VARCHAR(100),
       travels_name VARCHAR(255),
       type_of_bill VARCHAR(100),
       charges NUMERIC(10,2),
       per_ticket_amount NUMERIC(10,2),
       total_amount NUMERIC(10,2),
       status VARCHAR(50),
       upload_bill_image TEXT,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE leave_request (
       id SERIAL PRIMARY KEY,
       employee_id INT,
       employee_name VARCHAR(100),
       designation VARCHAR(100),
       department VARCHAR(100),
       from_date DATE,
       to_date DATE,
       reason TEXT,
       request_status VARCHAR(50),
       approved_by VARCHAR(100),
       hr_approval VARCHAR(100),
       approval_hr VARCHAR(100),
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE resume (
       id SERIAL PRIMARY KEY,
       candidate_name VARCHAR(150),
       candidate_email VARCHAR(150),
       candidate_mobile VARCHAR(20),
       applied_for_designation VARCHAR(100),
       req_id INT,
       experience NUMERIC(4,1),
       previous_company VARCHAR(150),
       previous_salary NUMERIC(12,2),
       reason_for_changing TEXT,
       marital_status VARCHAR(20),
       reference VARCHAR(150),
       address_present TEXT,
       resume TEXT,
       interviewer_planned VARCHAR(150),
       interviewer_actual VARCHAR(150),
       interviewer_status VARCHAR(50),
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Health Check
- `GET /health` - Server health check

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create employee
- `POST /api/employees/login` - Login with employee_code and password
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Requests
- `GET /api/requests` - Get all requests
- `GET /api/requests/:id` - Get request by ID
- `POST /api/requests` - Create request
- `PUT /api/requests/:id` - Update request
- `DELETE /api/requests/:id` - Delete request

### Ticket Book
- `GET /api/tickets` - Get all tickets
- `GET /api/tickets/:id` - Get ticket by ID
- `POST /api/tickets` - Create ticket (with image upload)
- `PUT /api/tickets/:id` - Update ticket (with optional image upload)
- `DELETE /api/tickets/:id` - Delete ticket

### Leave Requests
- `GET /api/leave-requests` - Get all leave requests
- `GET /api/leave-requests/:id` - Get leave request by ID
- `POST /api/leave-requests` - Create leave request
- `PUT /api/leave-requests/:id` - Update leave request
- `DELETE /api/leave-requests/:id` - Delete leave request

### Resumes
- `GET /api/resumes` - Get all resumes
- `GET /api/resumes/:id` - Get resume by ID
- `POST /api/resumes` - Create resume
- `PUT /api/resumes/:id` - Update resume
- `DELETE /api/resumes/:id` - Delete resume

### Planet Visitors
- `GET /api/planet-visitors` - List all planet visitors
- `GET /api/planet-visitors/:id` - Get visitor by ID
- `POST /api/planet-visitors` - Create visitor record (JSON payload)
- `PUT /api/planet-visitors/:id` - Update visitor attributes (JSON payload)
- `DELETE /api/planet-visitors/:id` - Remove a visitor record

POST and PUT requests must include `Authorization: Bearer <TOKEN>` and accept JSON bodies with the following fields: `person_name`, `employee_code`, `reason_for_visit`, `no_of_person`, `from_date`, `to_date`, `requester_name`, `request_for`, `remarks`, and `request_status`. Dates follow `YYYY-MM-DD`, `no_of_person` must be a positive integer, and `request_status` defaults to `PENDING` when omitted.

```bash
curl -X POST http://localhost:3005/api/planet-visitors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "person_name": "Rupesh Sahu",
    "employee_code": "EMP123",
    "reason_for_visit": "Stakeholder update",
    "no_of_person": 3,
    "from_date": "2024-06-01",
    "to_date": "2024-06-03",
    "requester_name": "Anita Verma",
    "request_for": "Laptop",
    "remarks": "Client facing visit"
  }'
```

```bash
curl -X PUT http://localhost:3005/api/planet-visitors/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "request_status": "APPROVED",
    "remarks": "Confirmed by HR"
  }'
```

### Leave Request (POST)
```json
{
  "employee_id": 12,
  "employee_name": "Rupesh Sahu",
  "designation": "Developer",
  "department": "IT",
  "from_date": "2024-04-01",
  "to_date": "2024-04-03",
  "reason": "Family function",
  "request_status": "Pending",
  "approved_by": null,
  "hr_approval": "Pending",
  "approval_hr": null
}
```

### Leave Request (PUT)
```bash
curl -X PUT http://localhost:3005/api/leave-requests/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{
    \"request_status\": \"Approved\",
    \"approved_by\": \"HR Manager\",
    \"hr_approval\": \"Approved\"
  }"
```

### Resume (POST)
```json
{
  "candidate_name": "Anita Verma",
  "candidate_email": "anita@example.com",
  "candidate_mobile": "9876543210",
  "applied_for_designation": "HR Executive",
  "req_id": 3,
  "experience": 2.5,
  "previous_company": "ABC Corp",
  "previous_salary": 350000,
  "reason_for_changing": "Career growth",
  "marital_status": "Single",
  "reference": "Suresh Kumar",
  "address_present": "Raipur, CG",
  "resume": "https://example.com/resume.pdf",
  "interviewer_planned": "Neha Singh",
  "interviewer_actual": "Neha Singh",
  "interviewer_status": "Scheduled"
}
```

### Resume (PUT)
```bash
curl -X PUT http://localhost:3005/api/resumes/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{
    \"interviewer_status\": \"Completed\",
    \"interviewer_actual\": \"Neha Singh\"
  }"
```

## Authentication and Roles

1. Login to get a token:
   - `POST /api/employees/login`
2. Send the token on every protected request:
   - `Authorization: Bearer <TOKEN>`
3. Token payload includes: `id`, `employee_code`, `employee_name`, `email`, `role`

Role enforcement:
- `Admin` required for `POST/PUT/DELETE /api/employees`
- `Admin` required for `DELETE /api/requests`
- `Admin` required for `DELETE /api/tickets`
Authentication:
- `Authorization: Bearer <TOKEN>` required for `/api/requests`, `/api/tickets`, `/api/leave-requests`, `/api/resumes`
Request numbers:
- `request_no` is auto-generated in the format `T-0001`, `T-0002`, ...

## Postman Examples (POST/PUT)

Use `Content-Type: application/json` for normal POST/PUT requests.

### Create Employee (POST)
```bash
curl -X POST http://localhost:3005/api/employees \
  -H "Content-Type: application/json" \
  -d "{
    "employee_code": "EMP001",
    "employee_name": "John Doe",
    "email": "john@example.com",
    "mobile_number": "9999999999",
    "department": "IT",
    "designation": "Developer",
    "joining_date": "2024-01-01",
    "role": "User",
    "status": "Active",
    "password": "plain-password"
  }"
```

### Update Employee (PUT)
```bash
curl -X PUT http://localhost:3005/api/employees/1 \
  -H "Content-Type: application/json" \
  -d "{
    "employee_code": "EMP001",
    "employee_name": "John Doe",
    "email": "john@example.com",
    "mobile_number": "9999999999",
    "department": "IT",
    "designation": "Senior Developer",
    "joining_date": "2024-01-01",
    "role": "User",
    "status": "Active",
    "password": "plain-password"
  }"
```

### Employee Login (POST)
```bash
curl -X POST http://localhost:3005/api/employees/login \
  -H "Content-Type: application/json" \
  -d "{
    "employee_code": "EMP001",
    "password": "plain-password"
  }"
```

### Create Request (POST)
```bash
curl -X POST http://localhost:3005/api/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{
    "person_name": "Rupesh Sahu",
    "type_of_travel": "Official",
    "reason_for_travel": "Client visit",
    "no_of_person": 2,
    "from_date": "2024-02-01",
    "to_date": "2024-02-03",
    "departure_date": "2024-02-01",
    "requester_name": "Anita Verma",
    "requester_designation": "Manager",
    "requester_department": "Admin",
    "request_for": "Laptop",
    "request_quantity": 1,
    "experience": "5 years",
    "education": "B.Tech",
    "remarks": "Urgent",
    "request_status": "Open"
  }"
```

### Update Request (PUT)
```bash
curl -X PUT http://localhost:3005/api/requests/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "{
    "person_name": "Rupesh Sahu",
    "type_of_travel": "Official",
    "reason_for_travel": "Client visit - updated",
    "no_of_person": 3,
    "from_date": "2024-02-01",
    "to_date": "2024-02-04",
    "departure_date": "2024-02-01",
    "request_status": "Approved"
  }"
```

## Image Upload

For ticket book endpoints, images are uploaded using `multipart/form-data`:

- Field name: `upload_bill_image`
- Supported formats: JPEG, JPG, PNG, GIF, PDF
- Max file size: 5MB
- Images are stored in `uploads/bills/` directory
- Image URLs are returned in format: `{BASE_URL}/uploads/bills/{filename}`

### Example Request (Create Ticket with Image)
```bash
curl -X POST http://localhost:3005/api/tickets \
  -F "person_name=Rupesh Sahu" \
  -F "booked_name=Anita Verma" \
  -F "bill_number=BILL001" \
  -F "travels_name=ABC Travels" \
  -F "type_of_bill=Invoice" \
  -F "charges=1000.00" \
  -F "per_ticket_amount=500.00" \
  -F "total_amount=1000.00" \
  -F "status=Active" \
  -F "upload_bill_image=@/path/to/image.jpg"
```

## Response Format

All API responses follow this format:

**Success:**
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error message"
}
```

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js              # Database configuration
│   ├── controllers/
│   │   ├── employeeController.js
│   │   ├── leaveRequestController.js
│   │   ├── requestController.js
│   │   ├── resumeController.js
│   │   └── ticketBookController.js
│   ├── models/
│   │   ├── employeeModel.js
│   │   ├── leaveRequestModel.js
│   │   ├── requestModel.js
│   │   ├── resumeModel.js
│   │   └── ticketBookModel.js
│   ├── services/
│   │   ├── employeeService.js
│   │   ├── leaveRequestService.js
│   │   ├── requestService.js
│   │   ├── resumeService.js
│   │   └── ticketBookService.js
│   ├── routes/
│   │   ├── employeeRoutes.js
│   │   ├── leaveRequestRoutes.js
│   │   ├── requestRoutes.js
│   │   ├── resumeRoutes.js
│   │   └── ticketBookRoutes.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── notFound.js
│   ├── utils/
│   │   └── upload.js           # File upload configuration
│   ├── app.js                  # Express app configuration
│   └── server.js               # Server entry point
├── uploads/
│   └── bills/                  # Uploaded bill images
├── package.json
└── README.md
```

## Dependencies

- **express**: Web framework
- **pg**: PostgreSQL client
- **multer**: File upload handling
- **cors**: Cross-origin resource sharing
- **helmet**: Security headers
- **morgan**: HTTP request logger
- **dotenv**: Environment variables

## Development

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```
