/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: Paste the `token` returned by `POST /auth/login`.
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: authToken
 *       description: >
 *         Session cookie set by `POST /auth/login`, sent automatically by a
 *         browser. The `Authorization` header is also accepted.
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange credentials for a JWT
 *     security: []
 *     description: >
 *       The only route that does not require a token. Returns a signed JWT and
 *       the authenticated user. An unknown email and a wrong password produce
 *       the same `401` so the endpoint cannot be used to discover accounts.
 *       Also sets an httpOnly `authToken` cookie, so a browser is authenticated
 *       immediately without handling the token. Use the **Authorize** button
 *       with the returned token for non-browser clients.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/LoginBody"
 *           example:
 *             email: admin@example.com
 *             password: admin123
 *     responses:
 *       "200":
 *         description: Authenticated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/SuccessResponse"
 *                 - type: object
 *                   properties:
 *                     data: { $ref: "#/components/schemas/LoginResponse" }
 *       "400":
 *         description: Malformed body
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *       "401":
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/UnauthorizedResponse" }
 */

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Clear the session cookie
 *     description: >
 *       Clears the `authToken` cookie. The token itself is not revoked, so any
 *       copy held elsewhere (for example an `Authorization` header) stays valid
 *       until it expires.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Session cookie cleared
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/SuccessResponse" }
 */

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get the signed-in user
 *     description: Lets any authenticated user read their own profile and leave balance.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: The authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/SuccessResponse"
 *                 - type: object
 *                   properties:
 *                     data: { $ref: "#/components/schemas/User" }
 *       "401":
 *         description: Missing, invalid or expired token
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/UnauthorizedResponse" }
 */

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List users
 *     description: Admin only. `passwordHash` is never included.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Users, newest first
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/SuccessResponse"
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: "#/components/schemas/User" }
 *       "401":
 *         description: Missing, invalid or expired token
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/UnauthorizedResponse" }
 *       "403":
 *         description: Authenticated but not an admin
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ForbiddenResponse" }
 */

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get one user
 *     description: Admin only.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: User ObjectId
 *         example: 6abacda7072b490f821f313e
 *     responses:
 *       "200":
 *         description: The user
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/SuccessResponse"
 *                 - type: object
 *                   properties:
 *                     data: { $ref: "#/components/schemas/User" }
 *       "400":
 *         description: Malformed id
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *       "401":
 *         description: Missing, invalid or expired token
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/UnauthorizedResponse" }
 *       "403":
 *         description: Authenticated but not an admin
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ForbiddenResponse" }
 *       "404":
 *         description: User not found
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 */

/**
 * @openapi
 * /users/reassign-annual-leave:
 *   post:
 *     tags: [Users]
 *     summary: Add a number of days to every user's leave balance
 *     description: >
 *       Admin only. Bulk operation: `number` is applied to every user, with no
 *       per-user targeting. A positive value grants leave and a negative value
 *       removes it. The request is rejected outright if the change would leave
 *       any user with a negative balance.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ReassignAnnualLeaveBody"
 *           example:
 *             number: 5
 *     responses:
 *       "200":
 *         description: Balances updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/SuccessResponse"
 *                 - type: object
 *                   properties:
 *                     message: { type: string, example: Annual leave reassigned successfully }
 *                     data:
 *                       type: object
 *                       properties:
 *                         updated: { type: integer, example: 3 }
 *       "400":
 *         description: >
 *           `number` missing, not a whole number, zero, or would leave a user
 *           with a negative balance
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *       "401":
 *         description: Missing, invalid or expired token
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/UnauthorizedResponse" }
 *       "403":
 *         description: Authenticated but not an admin
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ForbiddenResponse" }
 */

/**
 * @openapi
 * /requests:
 *   post:
 *     tags: [Requests]
 *     summary: Create a leave request
 *     description: >
 *       The request is attributed to the user in the bearer token; the body
 *       cannot choose the owner. Always starts as PENDING and does not touch
 *       the balance. Only Monday-Friday count as leave days, so a weekend-only
 *       range is rejected. Past dates and ranges overlapping an existing PENDING
 *       or APPROVED request for the same user are rejected.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/CreateRequestBody"
 *           example:
 *             startDate: "2026-10-05"
 *             endDate: "2026-10-09"
 *             reason: Family event
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
 *           Invalid input, startDate after endDate, a past start date, or a range
 *           containing zero working days
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *       "401":
 *         description: Missing, invalid or expired token
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/UnauthorizedResponse" }
 *       "409":
 *         description: Overlapping pending or approved request
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *   get:
 *     tags: [Requests]
 *     summary: List leave requests
 *     description: >
 *       An `EMPLOYEE` only ever receives their own requests; passing another
 *       `userId` returns `403`. An `ADMIN` receives all requests and may filter.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema: { $ref: "#/components/schemas/RequestStatus" }
 *         description: Filter by status
 *       - in: query
 *         name: userId
 *         required: false
 *         schema: { type: string }
 *         description: Filter by user. Admin only; employees are scoped to themselves.
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
 *         description: Unknown query parameter, invalid status, or malformed userId
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *       "401":
 *         description: Missing, invalid or expired token
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/UnauthorizedResponse" }
 *       "403":
 *         description: Employee attempted to read another user's requests
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ForbiddenResponse" }
 */

/**
 * @openapi
 * /requests/{id}:
 *   patch:
 *     tags: [Requests]
 *     summary: Approve or reject a request
 *     description: >
 *       Admin only. PENDING to APPROVED deducts the working days from the
 *       balance. PENDING to REJECTED changes nothing. APPROVED to REJECTED
 *       restores the deducted days. A REJECTED request is terminal. The balance
 *       change and the status change are applied in a single transaction, and the
 *       balance can never be driven negative by concurrent approvals.
 *       Requires MongoDB running as a replica set; the bundled docker-compose.yml
 *       provides a single-node replica set automatically.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
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
 *       "401":
 *         description: Missing, invalid or expired token
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/UnauthorizedResponse" }
 *       "403":
 *         description: Authenticated but not an admin
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ForbiddenResponse" }
 *       "404":
 *         description: Request not found
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *       "409":
 *         description: >
 *           Not pending, insufficient leave balance, or the request was already
 *           rejected
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 */
