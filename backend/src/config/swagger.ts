import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Zorvyn Finance Dashboard API',
      version: '1.0.0',
      description:
        'A comprehensive finance dashboard backend with RBAC, anomaly detection, and SMS auto-ledger. Built with Express, TypeScript, Prisma, and PostgreSQL.',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for SMS webhook',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['VIEWER', 'ANALYST', 'ADMIN'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            amount: { type: 'number' },
            type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
            category: { type: 'string' },
            date: { type: 'string', format: 'date' },
            notes: { type: 'string', nullable: true },
            userId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Anomaly: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            transactionId: { type: 'string' },
            type: { type: 'string', enum: ['HIGH_AMOUNT', 'DUPLICATE', 'UNUSUAL_FREQUENCY', 'CATEGORY_SPIKE'] },
            message: { type: 'string' },
            severity: { type: 'number', minimum: 0, maximum: 1 },
            isResolved: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' },
              },
            },
          },
        },
      },
    },
    paths: {
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: { 200: { description: 'Server is healthy' } },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          description: 'First user automatically becomes ADMIN',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8, description: 'Must contain uppercase, number, and special character' },
                    name: { type: 'string', minLength: 2 },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User registered successfully' },
            409: { description: 'Email already exists' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with email and password',
          description: 'Returns access and refresh tokens. Account locks after 5 failed attempts.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful' },
            401: { description: 'Invalid credentials' },
            429: { description: 'Account locked' },
          },
        },
      },
      '/api/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          description: 'Uses refresh token rotation — old token is invalidated',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: { refreshToken: { type: 'string' } },
                },
              },
            },
          },
          responses: { 200: { description: 'New token pair returned' } },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout and invalidate refresh token',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Logged out' } },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user profile',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'User profile' } },
        },
      },
      '/api/users': {
        get: {
          tags: ['Users'],
          summary: 'List all users (Admin only)',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'role', in: 'query', schema: { type: 'string', enum: ['VIEWER', 'ANALYST', 'ADMIN'] } },
          ],
          responses: { 200: { description: 'Paginated user list' } },
        },
        post: {
          tags: ['Users'],
          summary: 'Create a user (Admin only)',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' },
                    name: { type: 'string' },
                    role: { type: 'string', enum: ['VIEWER', 'ANALYST', 'ADMIN'] },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'User created' } },
        },
      },
      '/api/transactions': {
        get: {
          tags: ['Transactions'],
          summary: 'List transactions with filters',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['INCOME', 'EXPENSE'] } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['date', 'amount', 'createdAt'] } },
            { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          ],
          responses: { 200: { description: 'Paginated transaction list' } },
        },
        post: {
          tags: ['Transactions'],
          summary: 'Create a transaction (Admin only)',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount', 'type', 'category', 'date'],
                  properties: {
                    amount: { type: 'number' },
                    type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
                    category: { type: 'string' },
                    date: { type: 'string', format: 'date' },
                    notes: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Transaction created, anomaly detection triggered' } },
        },
      },
      '/api/dashboard/summary': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get financial summary (income, expenses, net balance)',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          ],
          responses: { 200: { description: 'Summary data' } },
        },
      },
      '/api/dashboard/category-totals': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get category-wise breakdown',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Category totals' } },
        },
      },
      '/api/dashboard/trends': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get monthly/weekly trends (Analyst+)',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'granularity', in: 'query', schema: { type: 'string', enum: ['weekly', 'monthly'] } },
          ],
          responses: { 200: { description: 'Trend data' } },
        },
      },
      '/api/dashboard/recent-activity': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get recent transactions',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'Recent activity' } },
        },
      },
      '/api/anomalies': {
        get: {
          tags: ['Anomalies'],
          summary: 'List detected anomalies (Analyst+)',
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'isResolved', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['HIGH_AMOUNT', 'DUPLICATE', 'UNUSUAL_FREQUENCY', 'CATEGORY_SPIKE'] } },
          ],
          responses: { 200: { description: 'Anomaly list' } },
        },
      },
      '/api/anomalies/{id}/resolve': {
        patch: {
          tags: ['Anomalies'],
          summary: 'Resolve an anomaly (Admin only)',
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Anomaly resolved' } },
        },
      },
      '/api/sms-ledger/webhook': {
        post: {
          tags: ['SMS Ledger'],
          summary: 'Receive forwarded bank SMS',
          description: 'Parses SMS, creates transaction, runs anomaly detection. Uses API key auth.',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: {
                    message: { type: 'string', description: 'Raw bank SMS text' },
                    sender: { type: 'string', description: 'SMS sender ID' },
                  },
                },
                examples: {
                  debit: {
                    summary: 'UPI Debit SMS',
                    value: { message: 'Rs.500.00 debited from A/c XX1234 on 15-Mar-25 to UPI/Swiggy. Bal: Rs.12,450.50', sender: 'HDFCBK' },
                  },
                  credit: {
                    summary: 'UPI Credit SMS',
                    value: { message: 'INR 25,000.00 credited to A/c XX5678 on 15-Mar-25. UPI Ref: 123456. Avl Bal: INR 1,37,450.50', sender: 'SBIBNK' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'SMS parsed and transaction created' },
            200: { description: 'SMS received but parsing failed' },
            401: { description: 'Invalid API key' },
          },
        },
      },
      '/api/sms-ledger/logs': {
        get: {
          tags: ['SMS Ledger'],
          summary: 'View SMS parse history (Admin only)',
          security: [{ BearerAuth: [] }],
          responses: { 200: { description: 'SMS logs' } },
        },
      },
    },
  },
  apis: [], // We define paths inline above
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Zorvyn Finance API Docs',
  }));

  // Raw JSON spec endpoint
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
