import swaggerJsdoc from 'swagger-jsdoc';
import { Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Studio Revenue Manager API',
      version: '1.0.0',
      description: 'API documentation for Studio Revenue Manager - a comprehensive studio booking and revenue management system',
      contact: {
        name: 'API Support',
        email: 'support@studio-revenue-manager.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.studio-revenue-manager.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /api/auth/login or /api/auth/register',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            ok: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'INVALID_ARGUMENT',
                },
                message: {
                  type: 'string',
                  example: 'Invalid input provided',
                },
                details: {
                  type: 'string',
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            role: {
              type: 'string',
              enum: ['admin', 'manager', 'viewer'],
              example: 'viewer',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints',
      },
      {
        name: 'Quote',
        description: 'Quote calculation and pricing endpoints',
      },
      {
        name: 'Reservation',
        description: 'Reservation management endpoints',
      },
      {
        name: 'Invoice',
        description: 'Invoice management endpoints',
      },
      {
        name: 'Calendar',
        description: 'Google Calendar integration endpoints',
      },
      {
        name: 'CSV Bank',
        description: 'CSV bank matching endpoints',
      },
      {
        name: 'Health',
        description: 'System health and monitoring endpoints',
      },
    ],
  },
  apis: [
    './src/routes/**/*.ts',
    './src/index.ts',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
