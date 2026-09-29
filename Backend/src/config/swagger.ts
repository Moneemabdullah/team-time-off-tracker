import path from 'node:path';

import swaggerJsdoc from 'swagger-jsdoc';

/**
 * Swagger definition. The JSDoc blocks below are the source of truth for the
 * OpenAPI document, so the docs sit next to the schema definitions they
 * describe rather than being duplicated by hand.
 */
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Team Time-Off Tracker API',
      version: '1.0.0',
      description:
        'Backend API for creating and reviewing employee time-off requests. ' +
        'There is no authentication in this project.',
    },
    servers: [{ url: '/', description: 'Current host' }],
    tags: [
      { name: 'Employees', description: 'Employee records' },
      { name: 'Requests', description: 'Leave requests and approvals' },
    ],
    components: {
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
        RequestStatus: {
          type: 'string',
          enum: ['PENDING', 'APPROVED', 'REJECTED'],
          example: 'PENDING',
        },
        Employee: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '6abacda7072b490f821f313e' },
            name: { type: 'string', example: 'Moneem Abdullah' },
            email: { type: 'string', format: 'email', example: 'moneem@example.com' },
            annualLeaveBalance: {
              type: 'integer',
              description: 'Server-managed. Starts at 20 and changes on approval or rejection.',
              example: 20,
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateEmployeeBody: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: { type: 'string', minLength: 3, example: 'Moneem Abdullah' },
            email: { type: 'string', format: 'email', example: 'moneem@example.com' },
          },
        },
        ReassignAnnualLeaveBody: {
          type: 'object',
          required: ['number'],
          properties: {
            number: {
              type: 'number',
              description:
                'Signed number of days added to every employee balance. ' +
                'This endpoint is not validated, so a non-numeric value is not rejected.',
              example: 5,
            },
          },
        },
        CreateRequestBody: {
          type: 'object',
          required: ['name', 'email', 'startDate', 'endDate', 'reason'],
          properties: {
            name: { type: 'string', minLength: 3, example: 'Moneem Abdullah' },
            email: { type: 'string', format: 'email', example: 'moneem@example.com' },
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
        LeaveRequest: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '6abacd3f296d71f2c0b00417' },
            employee: { $ref: '#/components/schemas/Employee' },
            startDate: { type: 'string', example: '2026-10-05' },
            endDate: { type: 'string', example: '2026-10-09' },
            reason: { type: 'string', example: 'Family trip' },
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
