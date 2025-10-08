export const openapiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'PatchNotes API',
        version: '1.0.0',
        description: 'Blog platform API for posts, auth, payments (M-Pesa), uploads.'
    },
    servers: [{ url: '/api/v1' }],
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
        },
        schemas: {
            Error: {
                type: 'object',
                properties: {
                    error: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            code: { type: 'string' },
                            details: {}
                        },
                        required: ['message', 'code']
                    }
                },
                required: ['error']
            },
            User: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    role: { type: 'string', enum: ['ADMIN', 'READER'] }
                },
                required: ['id', 'name', 'email', 'role']
            },
            PostSummary: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    title: { type: 'string' },
                    slug: { type: 'string' },
                    excerpt: { type: 'string' },
                    featuredImageUrl: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    category: { type: 'string' },
                    publishedAt: { type: 'string', format: 'date-time' },
                    createdAt: { type: 'string', format: 'date-time' }
                },
                required: ['id', 'title', 'slug', 'createdAt']
            },
            PostFull: {
                allOf: [
                    { $ref: '#/components/schemas/PostSummary' },
                    {
                        type: 'object',
                        properties: { contentMarkdown: { type: 'string' }, status: { type: 'string', enum: ['DRAFT', 'PUBLISHED'] } }
                    }
                ]
            },
            Transaction: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    postId: { type: 'string', nullable: true },
                    phone: { type: 'string' },
                    amount: { type: 'integer' },
                    checkoutRequestId: { type: 'string' },
                    merchantRequestId: { type: 'string' },
                    mpesaReceiptNumber: { type: 'string', nullable: true },
                    status: { type: 'string', enum: ['PENDING', 'SUCCESS', 'FAILED'] },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            }
        }
    },
    paths: {
        '/health': {
            get: {
                summary: 'Health check',
                responses: { '200': { description: 'OK' } }
            }
        },
        '/auth/login': {
            post: {
                summary: 'Login with email and password',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: { email: { type: 'string' }, password: { type: 'string' } },
                                required: ['email', 'password']
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Logged in',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        accessToken: { type: 'string' },
                                        user: { $ref: '#/components/schemas/User' }
                                    }
                                }
                            }
                        }
                    },
                    '401': { $ref: '#/components/schemas/Error' }
                }
            }
        },
        '/auth/refresh': {
            post: {
                summary: 'Rotate refresh token (cookie) and get new access token',
                responses: { '200': { description: 'New access token' }, '401': { description: 'Unauthorized' } }
            }
        },
        '/auth/logout': {
            post: {
                summary: 'Logout and invalidate refresh token',
                responses: { '200': { description: 'Logged out' } }
            }
        },
        '/posts': {
            get: {
                summary: 'List published posts',
                parameters: [
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                    { name: 'cursor', in: 'query', schema: { type: 'string' } }
                ],
                responses: {
                    '200': {
                        description: 'Post list',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        posts: { type: 'array', items: { $ref: '#/components/schemas/PostSummary' } },
                                        nextCursor: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/posts/{slug}': {
            get: {
                summary: 'Get post by slug',
                parameters: [
                    { name: 'slug', in: 'path', required: true, schema: { type: 'string' } }
                ],
                responses: {
                    '200': { description: 'Post', content: { 'application/json': { schema: { type: 'object', properties: { post: { $ref: '#/components/schemas/PostFull' } } } } } },
                    '404': { description: 'Not found' }
                }
            }
        },
        '/admin/posts': {
            post: {
                summary: 'Create post',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    title: { type: 'string' },
                                    contentMarkdown: { type: 'string' },
                                    tags: { type: 'array', items: { type: 'string' } },
                                    category: { type: 'string' },
                                    featuredImageUrl: { type: 'string' },
                                    status: { type: 'string', enum: ['DRAFT', 'PUBLISHED'] }
                                },
                                required: ['title', 'contentMarkdown']
                            }
                        }
                    }
                },
                responses: { '201': { description: 'Created' }, '401': { description: 'Unauthorized' }, '403': { description: 'Forbidden' } }
            }
        },
        '/admin/posts/{id}': {
            put: { summary: 'Update post', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Updated' } } },
            delete: { summary: 'Delete post', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Deleted' } } }
        },
        '/admin/uploads': { post: { summary: 'Upload image', security: [{ bearerAuth: [] }], responses: { '200': { description: 'URL returned' } } } },
        '/payments/stkpush': {
            post: {
                summary: 'Initiate M-Pesa STK Push',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    postId: { type: 'string', nullable: true },
                                    phone: { type: 'string' },
                                    amount: { type: 'integer' }
                                },
                                required: ['phone', 'amount']
                            }
                        }
                    }
                },
                responses: { '200': { description: 'Pending' }, '400': { description: 'Bad request' } }
            }
        },
        '/mpesa/callback': { post: { summary: 'Daraja callback', responses: { '200': { description: 'OK' } } } },
        '/payments/{checkoutRequestId}/status': {
            get: { summary: 'Check STK status', parameters: [{ name: 'checkoutRequestId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Status' } } }
        },
        '/admin/transactions': { get: { summary: 'List transactions', security: [{ bearerAuth: [] }], responses: { '200': { description: 'List' } } } },
        '/admin/stats': { get: { summary: 'Admin stats', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Stats' } } } }
    }
};
