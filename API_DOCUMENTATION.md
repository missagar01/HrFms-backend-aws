# API Documentation

## Base URL
```
http://localhost:3000/api
```

## Request Endpoints

### Get All Requests
```http
GET /api/requests
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "person_name": "John Doe",
      "indent_no": "IND001",
      "type_of_travel": "Domestic",
      "reason_for_travel": "Business meeting",
      "no_of_person": 2,
      "from_date": "2024-01-01",
      "to_date": "2024-01-05",
      "departure_date": "2024-01-01",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Get Request by ID
```http
GET /api/requests/:id
```

### Create Request
```http
POST /api/requests
Content-Type: application/json

{
  "person_name": "John Doe",
  "indent_no": "IND001",
  "type_of_travel": "Domestic",
  "reason_for_travel": "Business meeting",
  "no_of_person": 2,
  "from_date": "2024-01-01",
  "to_date": "2024-01-05",
  "departure_date": "2024-01-01"
}
```

### Update Request
```http
PUT /api/requests/:id
Content-Type: application/json

{
  "person_name": "Jane Doe",
  "no_of_person": 3
}
```

### Delete Request
```http
DELETE /api/requests/:id
```

## Ticket Book Endpoints

### Get All Tickets
```http
GET /api/tickets
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "bill_number": "BILL001",
      "travels_name": "ABC Travels",
      "type_of_bill": "Invoice",
      "charges": "1000.00",
      "per_ticket_amount": "500.00",
      "total_amount": "1000.00",
      "status": "Active",
      "upload_bill_image": "http://localhost:3000/uploads/bills/bill-1234567890.jpg",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Get Ticket by ID
```http
GET /api/tickets/:id
```

### Create Ticket (with Image Upload)
```http
POST /api/tickets
Content-Type: multipart/form-data

Form Data:
- bill_number: "BILL001"
- travels_name: "ABC Travels"
- type_of_bill: "Invoice"
- charges: "1000.00"
- per_ticket_amount: "500.00"
- total_amount: "1000.00"
- status: "Active"
- upload_bill_image: [file]
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/tickets \
  -F "bill_number=BILL001" \
  -F "travels_name=ABC Travels" \
  -F "type_of_bill=Invoice" \
  -F "charges=1000.00" \
  -F "per_ticket_amount=500.00" \
  -F "total_amount=1000.00" \
  -F "status=Active" \
  -F "upload_bill_image=@/path/to/image.jpg"
```

### Update Ticket (with Optional Image Upload)
```http
PUT /api/tickets/:id
Content-Type: multipart/form-data

Form Data:
- bill_number: "BILL002"
- upload_bill_image: [file] (optional)
```

### Delete Ticket
```http
DELETE /api/tickets/:id
```

## Planet Visitor Endpoints

All planet visitor endpoints require an `Authorization: Bearer <TOKEN>` header and accept JSON payloads where applicable. Dates should be `YYYY-MM-DD`.

### Get All Visitors
```http
GET /api/planet-visitors
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "person_name": "Rupesh Sahu",
      "employee_code": "EMP123",
      "reason_for_visit": "Client briefing",
      "no_of_person": 2,
      "from_date": "2024-06-01",
      "to_date": "2024-06-03",
      "requester_name": "Anita Verma",
      "request_for": "Laptop",
      "remarks": "Traveling with client",
      "request_status": "PENDING",
      "created_at": "2024-06-01T00:00:00.000Z",
      "updated_at": "2024-06-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Get Visitor by ID
```http
GET /api/planet-visitors/:id
```

### Create Visitor
```http
POST /api/planet-visitors
Content-Type: application/json

{
  "person_name": "Rupesh Sahu",
  "employee_code": "EMP123",
  "reason_for_visit": "Stakeholder update",
  "no_of_person": 3,
  "from_date": "2024-06-01",
  "to_date": "2024-06-03",
  "requester_name": "Anita Verma",
  "request_for": "Laptop",
  "remarks": "Client facing visit"
}
```

**Notes:** The API normalizes empty strings to `null`, enforces `from_date <= to_date`, requires `no_of_person` to be a positive whole number, and applies `request_status = "PENDING"` if no status is supplied.

### Update Visitor
```http
PUT /api/planet-visitors/:id
Content-Type: application/json

{
  "request_status": "APPROVED",
  "remarks": "Confirmed by HR"
}
```

### Delete Visitor
```http
DELETE /api/planet-visitors/:id
```

## Image Access

Uploaded images are accessible via:
```
http://localhost:3000/uploads/bills/{filename}
```

The `upload_bill_image` field in ticket responses contains the full URL to the image.

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Missing required fields: person_name, indent_no"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Request not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Notes

- All dates should be in `YYYY-MM-DD` format
- Image uploads are limited to 5MB
- Supported image formats: JPEG, JPG, PNG, GIF, PDF
- All numeric fields (charges, per_ticket_amount, total_amount) should be positive numbers

