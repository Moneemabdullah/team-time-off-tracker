/**
 * @openapi
 * components:
 *   schemas:
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: true }
 *         data: { type: object }
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: false }
 *         message: { type: string, example: Employee not found }
 *     RequestStatus:
 *       type: string
 *       enum: [PENDING, APPROVED, REJECTED]
 *       example: PENDING
 *     Employee:
 *       type: object
 *       properties:
 *         id: { type: string, example: 6abacda7072b490f821f313e }
 *         name: { type: string, example: Moneem Abdullah }
 *         email: { type: string, format: email, example: moneem@example.com }
 *         annualLeaveBalance:
 *           type: integer
 *           description: Server-managed. Starts at 20 and changes on approval or rejection.
 *           example: 20
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *     CreateEmployeeBody:
 *       type: object
 *       required: [name, email]
 *       properties:
 *         name: { type: string, minLength: 3, example: Moneem Abdullah }
 *         email: { type: string, format: email, example: moneem@example.com }
 *     CreateRequestBody:
 *       type: object
 *       required: [employeeId, startDate, endDate, reason]
 *       properties:
 *         employeeId: { type: string, example: 6abacda7072b490f821f313e }
 *         startDate: { type: string, example: "2026-10-05" }
 *         endDate: { type: string, example: "2026-10-09" }
 *         reason: { type: string, minLength: 3, example: Family trip }
 *     UpdateRequestStatusBody:
 *       type: object
 *       required: [status]
 *       properties:
 *         status: { type: string, enum: [APPROVED, REJECTED], example: APPROVED }
 *     LeaveRequest:
 *       type: object
 *       properties:
 *         id: { type: string, example: 6abacd3f296d71f2c0b00417 }
 *         employee: { $ref: "#/components/schemas/Employee" }
 *         startDate: { type: string, example: "2026-10-05" }
 *         endDate: { type: string, example: "2026-10-09" }
 *         reason: { type: string, example: Family trip }
 *         days:
 *           type: integer
 *           description: Working days (Mon-Fri) counted by the server.
 *           example: 5
 *         status: { $ref: "#/components/schemas/RequestStatus" }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */

/**
 * @openapi
 * /employees:
 *   post:
 *     tags: [Employees]
 *     summary: Create an employee
 *     description: >
 *       Creates an employee with a leave balance of 20. The balance is
 *       server-managed and cannot be supplied or modified by the client.
 *       Email must be unique.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateEmployeeBody"
 *           example:
 *             name: Moneem Abdullah
 *             email: moneem@example.com
 *     responses:
 *       "201":
 *         description: Employee created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/SuccessResponse"
 *                 - type: object
 *                   properties:
 *                     data: { $ref: "#/components/schemas/Employee" }
 *       "400":
 *         description: Invalid input, or a balance field was sent by the client
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *       "409":
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *   get:
 *     tags: [Employees]
 *     summary: List all employees
 *     responses:
 *       "200":
 *         description: Employees, newest first
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/SuccessResponse"
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: "#/components/schemas/Employee" }
 */

/**
 * @openapi
 * /employees/{id}:
 *   get:
 *     tags: [Employees]
 *     summary: Get one employee
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Employee ObjectId
 *         example: 6abacda7072b490f821f313e
 *     responses:
 *       "200":
 *         description: The employee
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/SuccessResponse"
 *                 - type: object
 *                   properties:
 *                     data: { $ref: "#/components/schemas/Employee" }
 *       "400":
 *         description: Malformed id
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *       "404":
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 */

/**
 * @openapi
 * /requests:
 *   post:
 *     tags: [Requests]
 *     summary: Create a leave request
 *     description: >
 *       Always starts as PENDING and does not touch the leave balance.
 *       Only Monday-Friday count as leave days, so a weekend-only range is
 *       rejected. Past dates and ranges overlapping an existing PENDING or
 *       APPROVED request for the same employee are rejected.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateRequestBody"
 *           example:
 *             employeeId: 6abacda7072b490f821f313e
 *             startDate: "2026-10-05"
 *             endDate: "2026-10-09"
 *             reason: Family trip
 *     responses:
 *       "201":
 *         description: Request created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/SuccessResponse"
 *                 - type: object
 *                   properties:
 *                     data: { $ref: "#/components/schemas/LeaveRequest" }
 *       "400":
 *         description: >
 *           Invalid input, startDate after endDate, a past start date, or a
 *           range containing zero working days
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *       "404":
 *         description: Employee not found
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *       "409":
 *         description: Overlapping pending or approved request
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *   get:
 *     tags: [Requests]
 *     summary: List leave requests
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema: { $ref: "#/components/schemas/RequestStatus" }
 *         description: Filter by status
 *       - in: query
 *         name: employeeId
 *         required: false
 *         schema: { type: string }
 *         description: Filter by employee ObjectId
 *         example: 6abacda7072b490f821f313e
 *     responses:
 *       "200":
 *         description: Matching requests, newest first
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/SuccessResponse"
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: "#/components/schemas/LeaveRequest" }
 *       "400":
 *         description: Unknown query parameter, invalid status, or malformed employeeId
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 */

/**
 * @openapi
 * /requests/{id}:
 *   patch:
 *     tags: [Requests]
 *     summary: Approve or reject a request
 *     description: >
 *       PENDING to APPROVED deducts the working days from the balance.
 *       PENDING to REJECTED changes nothing. APPROVED to REJECTED restores
 *       the deducted days. A REJECTED request is terminal. The balance change
 *       and the status change are applied in a single transaction, and the
 *       balance can never be driven negative by concurrent approvals.
 *       Requires MongoDB running as a replica set; the bundled docker-compose.yml
 *       provides a single-node replica set automatically.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Leave request ObjectId
 *         example: 6abacd3f296d71f2c0b00417
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UpdateRequestStatusBody"
 *           example:
 *             status: APPROVED
 *     responses:
 *       "200":
 *         description: Request updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/SuccessResponse"
 *                 - type: object
 *                   properties:
 *                     data: { $ref: "#/components/schemas/LeaveRequest" }
 *       "400":
 *         description: Malformed id, or a status other than APPROVED or REJECTED
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *       "404":
 *         description: Request not found
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *       "409":
 *         description: >
 *           Not pending, insufficient leave balance, or the request was
 *           already rejected
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 */
