import path from 'node:path';

import swaggerJsdoc from 'swagger-jsdoc';

/**
 * Swagger definition. The JSDoc blocks in `swagger.docs.ts` describe the paths
 * and reuse the schemas below.
 */
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Team Time-Off Tracker API',
      version: '1.0.0',
      description:
        'Backend API for submitting and reviewing employee time-off requests. ' +
        'All routes except `POST /auth/login` and `GET /health` require a bearer ' +
        'token. Use the **Authorize** button to paste a token from the login response.',
    },
    servers: [{ url: '/', description: 'Current host' }],
    tags: [
      { name: 'Auth', description: 'Authentication' },
      { name: 'Users', description: 'User records and leave balances' },
      { name: 'Admin', description: 'Admin-only operations (all mounted under /admin)' },
      { name: 'Requests', description: 'Leave requests and approvals' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste the `token` returned by `POST /auth/login`.',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'authToken',
          description:
            'Session cookie set by `POST /auth/login`. Sent automatically by a browser. ' +
            'The `Authorization` header is also accepted for non-browser clients.',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: { success: { type: 'boolean', example: true }, data: { type: 'object' } },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Employee not found' },
          },
        },
        UnauthorizedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Invalid or expired token' },
          },
        },
        ForbiddenResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: {
              type: 'string',
              example: 'You do not have permission to perform this action',
            },
          },
        },
        RequestStatus: {
          type: 'string',
          enum: ['PENDING', 'APPROVED', 'REJECTED'],
          example: 'PENDING',
        },
        UserRole: {
          type: 'string',
          enum: ['EMPLOYEE', 'ADMIN'],
          example: 'EMPLOYEE',
        },
        User: {
          type: 'object',
          description: 'A user. `passwordHash` is never returned by the API.',
          properties: {
            id: { type: 'string', example: '6abacda7072b490f821f313e' },
            name: { type: 'string', example: 'Moneem Abdullah' },
            email: { type: 'string', format: 'email', example: 'moneem@example.com' },
            role: { $ref: '#/components/schemas/UserRole' },
            annualLeaveBalance: {
              type: 'integer',
              description: 'Server-managed. Starts at 20 and changes on approval or rejection.',
              example: 20,
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        LoginBody: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@example.com' },
            password: { type: 'string', format: 'password', example: 'admin123' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'JWT. Send as `Authorization: Bearer <token>`.' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        CreateRequestBody: {
          type: 'object',
          required: ['startDate', 'endDate', 'reason'],
          description:
            'The submitting user is taken from the bearer token. `userId`, `name`, ' +
            '`email`, `days` and `status` are rejected.',
          properties: {
            startDate: { type: 'string', example: '2026-10-05' },
            endDate: { type: 'string', example: '2026-10-09' },
            reason: { type: 'string', minLength: 3, example: 'Family event' },
          },
        },
        UpdateRequestStatusBody: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['APPROVED', 'REJECTED'], example: 'APPROVED' },
          },
        },
        ReassignAnnualLeaveBody: {
          type: 'object',
          required: ['number'],
          properties: {
            number: {
              type: 'integer',
              description:
                'Signed whole number of days added to every user balance. ' +
                'Rejected if it would leave any user negative.',
              example: 5,
            },
          },
        },
        PaginationMeta: {
          type: 'object',
          description: 'Pagination block returned alongside `data` on list endpoints.',
          properties: {
            total: { type: 'integer', description: 'Total matching records', example: 42 },
            page: { type: 'integer', description: 'Current 1-based page', example: 1 },
            limit: { type: 'integer', description: 'Items per page', example: 10 },
            totalPages: { type: 'integer', description: 'Pages available at this limit', example: 5 },
          },
        },
        LeaveRequest: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '6abacd3f296d71f2c0b00417' },
            user: { $ref: '#/components/schemas/User' },
            startDate: { type: 'string', example: '2026-10-05' },
            endDate: { type: 'string', example: '2026-10-09' },
            reason: { type: 'string', example: 'Family event' },
            days: {
              type: 'integer',
              description: 'Working days (Mon-Fri) counted by the server.',
              example: 5,
            },
            status: { $ref: '#/components/schemas/RequestStatus' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  // Matches the source file under tsx and the emitted file under `npm start`.
  apis: [path.join(__dirname, 'swagger.docs.{ts,js}')],
};

const swaggerDocument = swaggerJsdoc(options);

export default swaggerDocument;
