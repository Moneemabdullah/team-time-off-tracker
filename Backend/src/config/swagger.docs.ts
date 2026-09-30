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
 * /admin/requests:
 *   get:
 *     tags: [Requests]
 *     summary: List every leave request (admin only)
 *     description: >
 *       Returns requests across every user, newest first, one page at a time.
 *       Optionally filter by `status` and/or by the owning `userId`.
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
 *         description: Filter by owner. Admin only.
 *         example: 6abacda7072b490f821f313e
 *       - in: query
 *         name: page
 *         required: false
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         description: 1-based page number
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *         description: Items per page. Values above 100 are rejected with 400.
 *     responses:
 *       "200":
 *         description: A page of requests, with pagination metadata
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
 *                     meta: { $ref: "#/components/schemas/PaginationMeta" }
 *       "400":
 *         description: Unknown query parameter, invalid status, or malformed page/limit
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
 * /admin/requests/{id}:
 *   patch:
 *     tags: [Requests]
 *     summary: Approve or reject a request (admin only)
 *     description: >
 *       PENDING to APPROVED deducts the leave days from the balance.
 *       PENDING to REJECTED changes nothing. APPROVED to REJECTED restores the
 *       deducted days. A REJECTED request is terminal. The balance change and
 *       the status change are applied in a single transaction, and the balance
 *       can never be driven negative by concurrent approvals. Requires MongoDB
 *       running as a replica set; the bundled docker-compose.yml provides a
 *       single-node replica set automatically.
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
 *         description: Not pending, insufficient leave balance, or already rejected
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 */

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Users]
 *     summary: List users (admin only)
 *     description: >
 *       Admin only. Returns employees; accounts with the ADMIN role are excluded.
 *       `passwordHash` is never included.
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
 *   post:
 *     tags: [Users]
 *     summary: Create an employee (admin only)
 *     description: >
 *       Creates an account with the default 20 day leave balance and emails the
 *       new employee their temporary password. A failure to send the email does
 *       not fail this request; the account is still created and the failure is
 *       logged.
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, minLength: 3, example: Moneem Abdullah }
 *               email: { type: string, format: email, example: moneem@example.com }
 *               password: { type: string, minLength: 8, example: temp-pass-123 }
 *               role:
 *                 type: string
 *                 enum: [EMPLOYEE, ADMIN]
 *                 default: EMPLOYEE
 *     responses:
 *       "201":
 *         description: Employee created and credentials emailed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/SuccessResponse"
 *                 - type: object
 *                   properties:
 *                     message: { type: string }
 *                     data: { $ref: "#/components/schemas/User" }
 *       "400":
 *         description: Invalid input, or an attempt to demote/delete the last admin
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
 *       "409":
 *         description: Email already in use
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 */

/**
 * @openapi
 * /admin/users/reassign-annual-leave:
 *   post:
 *     tags: [Users]
 *     summary: Add a number of days to every user's leave balance (admin only)
 *     description: >
 *       Bulk operation: `number` is applied to every user, with no per-user
 *       targeting. A positive value grants leave and a negative value removes
 *       it. The request is rejected outright if the change would leave any user
 *       with a negative balance.
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
 *         description: number missing, not a whole number, zero, or would leave a user negative
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
 * /admin/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get one user (admin only)
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
 *   patch:
 *     tags: [Users]
 *     summary: Update a user (admin only)
 *     description: >
 *       Admin only, because the body may change a user's `role`. Demoting the
 *       last remaining admin is rejected.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, minLength: 3 }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               role: { type: string, enum: [EMPLOYEE, ADMIN] }
 *     responses:
 *       "200":
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/SuccessResponse"
 *                 - type: object
 *                   properties:
 *                     message: { type: string }
 *                     data: { $ref: "#/components/schemas/User" }
 *       "400":
 *         description: Invalid input, malformed id, or an attempt to demote the last admin
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
 *       "409":
 *         description: Email already used by another account
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user (admin only)
 *     description: >
 *       Admin only. Deleting your own account is rejected, as is deleting the
 *       last remaining admin, so the system cannot be left without an
 *       administrator.
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
 *         description: User deleted
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/SuccessResponse" }
 *       "400":
 *         description: Malformed id, own account, or the last remaining admin
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
 * /requests:
 *   post:
 *     tags: [Requests]
 *     summary: Create a leave request
 *     description: >
 *       The request is attributed to the user in the bearer token; the body
 *       cannot choose the owner. Always starts as PENDING and does not touch
 *       the balance. Leave days are counted inclusively and Sundays are excluded,
 *       so a range covering only Sundays is rejected. Past dates and ranges
 *       overlapping an existing PENDING or APPROVED request for the same user are
 *       rejected.
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
 *           containing no leave days
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
 *     summary: List your own leave requests
 *     description: >
 *       Always scoped to the caller, whoever they are. There is no `userId`
 *       filter here — passing one is rejected with `400` as an unknown query
 *       parameter. Use `GET /admin/requests` for the all-users view.
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
 *         name: page
 *         required: false
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         description: 1-based page number
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *         description: Items per page. Values above 100 are rejected with 400.
 *     responses:
 *       "200":
 *         description: A page of your requests, with pagination metadata
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
 *                     meta: { $ref: "#/components/schemas/PaginationMeta" }
 *       "400":
 *         description: Unknown query parameter, invalid status, or malformed page/limit
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *       "401":
 *         description: Missing, invalid or expired token
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/UnauthorizedResponse" }
 */

