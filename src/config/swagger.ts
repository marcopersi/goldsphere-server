import swaggerJSDoc from 'swagger-jsdoc';
import { Request } from 'express';

// Get base URL based on environment
function getServerUrl(): string {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return 'https://api.goldsphere.vault/api';
    case 'staging':
      return 'https://staging-api.goldsphere.vault/api';
    case 'development':
    default:
      return `http://localhost:${process.env.PORT || 8080}/api`;
  }
}

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'GoldSphere API',
    version: '1.0.0',
    description: 'API for GoldSphere precious metals trading platform',
    contact: {
      name: 'GoldSphere Team',
      email: 'api@goldsphere.vault'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: getServerUrl(),
      description: `${process.env.NODE_ENV || 'development'} server`
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for authentication'
      }
    },
    schemas: {
      Product: {
        type: 'object',
        required: ['id', 'name', 'type', 'metal', 'weight', 'weightUnit', 'purity', 'price', 'currency', 'producer', 'imageUrl', 'inStock', 'minimumOrderQuantity', 'createdAt', 'updatedAt'],
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier for the product'
          },
          name: {
            type: 'string',
            description: 'Product name'
          },
          type: {
            type: 'string',
            enum: ['coin', 'bar', 'round'],
            description: 'Type of precious metal product'
          },
          metal: {
            type: 'string',
            enum: ['gold', 'silver', 'platinum', 'palladium'],
            description: 'Type of metal'
          },
          weight: {
            type: 'number',
            description: 'Weight of the product'
          },
          weightUnit: {
            type: 'string',
            enum: ['grams', 'troy_ounces', 'kilograms'],
            description: 'Unit of weight measurement'
          },
          purity: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Metal purity (e.g., 0.999 for 99.9% pure)'
          },
          price: {
            type: 'number',
            description: 'Current price'
          },
          currency: {
            type: 'string',
            enum: ['USD', 'EUR', 'GBP', 'CHF'],
            description: 'Price currency'
          },
          producer: {
            type: 'string',
            description: 'Manufacturer/mint'
          },
          country: {
            type: 'string',
            description: 'Country of origin'
          },
          year: {
            type: 'integer',
            description: 'Year of production'
          },
          description: {
            type: 'string',
            description: 'Product description'
          },
          imageUrl: {
            type: 'string',
            format: 'uri',
            description: 'Product image URL'
          },
          inStock: {
            type: 'boolean',
            description: 'Availability status'
          },
          stockQuantity: {
            type: 'integer',
            description: 'Available quantity'
          },
          minimumOrderQuantity: {
            type: 'integer',
            description: 'Minimum order quantity'
          },
          premiumPercentage: {
            type: 'number',
            description: 'Premium over spot price'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        }
      },
      ProductRegistrationRequest: {
        type: 'object',
        required: ['name', 'type', 'metal', 'weight', 'weightUnit', 'purity', 'price', 'currency', 'producer', 'imageUrl', 'inStock', 'minimumOrderQuantity'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['coin', 'bar', 'round'] },
          metal: { type: 'string', enum: ['gold', 'silver', 'platinum', 'palladium'] },
          weight: { type: 'number' },
          weightUnit: { type: 'string', enum: ['grams', 'troy_ounces', 'kilograms'] },
          purity: { type: 'number', minimum: 0, maximum: 1 },
          price: { type: 'number' },
          currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'CHF'] },
          producer: { type: 'string' },
          country: { type: 'string' },
          year: { type: 'integer' },
          description: { type: 'string' },
          imageUrl: { type: 'string', format: 'uri' },
          inStock: { type: 'boolean' },
          stockQuantity: { type: 'integer' },
          minimumOrderQuantity: { type: 'integer' },
          premiumPercentage: { type: 'number' }
        }
      },
      Position: {
        type: 'object',
        required: ['id', 'userId', 'productId', 'purchaseDate', 'purchasePrice', 'marketPrice', 'quantity', 'country', 'producer', 'certifiedProvenance', 'status', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', description: 'Unique identifier for the position' },
          userId: { type: 'string', description: 'User who owns this position' },
          productId: { type: 'string', description: 'Product identifier' },
          purchaseDate: { type: 'string', format: 'date-time', description: 'When the position was purchased' },
          purchasePrice: { type: 'number', description: 'Price paid per unit' },
          marketPrice: { type: 'number', description: 'Current market price per unit' },
          quantity: { type: 'number', description: 'Quantity owned' },
          country: { type: 'string', description: 'Country of origin' },
          producer: { type: 'string', description: 'Producer/mint name' },
          certifiedProvenance: { type: 'boolean', description: 'Whether provenance is certified' },
          status: { type: 'string', enum: ['active', 'closed'], description: 'Position status' },
          closedDate: { type: 'string', format: 'date-time', description: 'When position was closed (if applicable)' },
          notes: { type: 'string', description: 'Optional notes' },
          custodyServiceId: { type: 'string', description: 'Custody service identifier for this position' },
          custody: {
            type: 'object',
            description: 'Custody information for this position',
            properties: {
              custodyServiceId: { type: 'string', description: 'Custody service identifier' },
              custodyServiceName: { type: 'string', description: 'Name of the custody service' },
              custodianId: { type: 'string', description: 'Custodian identifier' },
              custodianName: { type: 'string', description: 'Name of the custodian' },
              fee: { type: 'number', description: 'Custody fee amount' },
              paymentFrequency: { type: 'string', enum: ['Monthly', 'Quarterly', 'Annual'], description: 'Fee payment frequency' }
            }
          },
          createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
          updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' }
        }
      },
      Transaction: {
        type: 'object',
        required: ['id', 'positionId', 'userId', 'type', 'date', 'quantity', 'price', 'fees', 'createdAt'],
        properties: {
          id: { type: 'string', description: 'Unique identifier for the transaction' },
          positionId: { type: 'string', description: 'Associated position ID' },
          userId: { type: 'string', description: 'User who made the transaction' },
          type: { type: 'string', enum: ['buy', 'sell'], description: 'Transaction type' },
          date: { type: 'string', format: 'date-time', description: 'Transaction date' },
          quantity: { type: 'number', description: 'Quantity transacted' },
          price: { type: 'number', description: 'Price per unit' },
          fees: { type: 'number', description: 'Transaction fees' },
          notes: { type: 'string', description: 'Optional notes' },
          createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' }
        }
      },
      PositionCreateRequest: {
        type: 'object',
        required: ['productId', 'purchaseDate', 'purchasePrice', 'quantity', 'countryId', 'producer', 'certifiedProvenance'],
        properties: {
          productId: { type: 'string' },
          purchaseDate: { type: 'string', format: 'date-time' },
          purchasePrice: { type: 'number' },
          quantity: { type: 'number' },
          country: { type: 'string' },
          producer: { type: 'string' },
          certifiedProvenance: { type: 'boolean' },
          notes: { type: 'string' }
        }
      },
      TransactionCreateRequest: {
        type: 'object',
        required: ['positionId', 'type', 'date', 'quantity', 'price'],
        properties: {
          positionId: { type: 'string' },
          type: { type: 'string', enum: ['buy', 'sell'] },
          date: { type: 'string', format: 'date-time' },
          quantity: { type: 'number' },
          price: { type: 'number' },
          fees: { type: 'number', default: 0 },
          notes: { type: 'string' }
        }
      },
      PortfolioSummary: {
        type: 'object',
        properties: {
          totalValue: { type: 'number', description: 'Total portfolio value' },
          totalCost: { type: 'number', description: 'Total cost basis' },
          totalGainLoss: { type: 'number', description: 'Total gain/loss amount' },
          totalGainLossPercentage: { type: 'number', description: 'Total gain/loss percentage' },
          positionCount: { type: 'integer', description: 'Number of positions' },
          metalBreakdown: {
            type: 'object',
            description: 'Breakdown by metal type',
            properties: {
              gold: { $ref: '#/components/schemas/MetalBreakdown' },
              silver: { $ref: '#/components/schemas/MetalBreakdown' },
              platinum: { $ref: '#/components/schemas/MetalBreakdown' },
              palladium: { $ref: '#/components/schemas/MetalBreakdown' }
            }
          },
          lastUpdated: { type: 'string', format: 'date-time' }
        }
      },
      MetalBreakdown: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'Total value for this metal' },
          percentage: { type: 'number', description: 'Percentage of total portfolio' },
          weight: { type: 'number', description: 'Total weight owned' },
          positionCount: { type: 'integer', description: 'Number of positions for this metal' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message'
          },
          details: {
            type: 'string',
            description: 'Detailed error information'
          }
        }
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Validation failed'
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
                code: { type: 'string' }
              }
            }
          }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          token: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' }
            }
          }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'User unique identifier' },
          email: { type: 'string', format: 'email', description: 'User email address' },
          role: { type: 'string', enum: ['customer', 'advisor', 'admin'], description: 'User role' },
          accountStatus: { type: 'string', enum: ['active', 'blocked', 'suspended', 'deleted'], description: 'Account status' },
          emailVerified: { type: 'boolean', description: 'Email verification status' },
          createdAt: { type: 'string', format: 'date-time', description: 'Account creation timestamp' },
          updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
          blockedAt: { type: 'string', format: 'date-time', nullable: true, description: 'When the user was blocked' },
          blockedBy: { type: 'string', format: 'uuid', nullable: true, description: 'Admin who blocked the user' },
          blockReason: { type: 'string', nullable: true, description: 'Reason for blocking' }
        }
      },
      BlockUserRequest: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { 
            type: 'string', 
            minLength: 1,
            description: 'Reason for blocking the user'
          }
        }
      },
      BlockUserResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              accountStatus: { type: 'string', enum: ['blocked'] },
              blockedAt: { type: 'string', format: 'date-time' },
              blockedBy: { type: 'string', format: 'uuid' },
              blockReason: { type: 'string' }
            }
          }
        }
      },
      UnblockUserResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              accountStatus: { type: 'string', enum: ['active'] }
            }
          }
        }
      },
      SoftDeleteUserResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              accountStatus: { type: 'string', enum: ['deleted'] }
            }
          }
        }
      },
      BlockedUsersResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                accountStatus: { type: 'string', enum: ['blocked', 'suspended'] },
                blockedAt: { type: 'string', format: 'date-time' },
                blockedBy: { type: 'string', format: 'uuid' },
                blockReason: { type: 'string' }
              }
            }
          }
        }
      },
      Custodian: {
        type: 'object',
        required: ['id', 'name', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Unique identifier' },
          name: { type: 'string', description: 'Custodian name' },
          createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
          updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' }
        }
      },
      CustodianCreateRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, description: 'Custodian name' }
        }
      },
      CustodyService: {
        type: 'object',
        required: ['id', 'custodyServiceName', 'custodianId', 'custodianName', 'fee', 'paymentFrequency', 'currencyId', 'currency'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Unique identifier' },
          custodyServiceName: { type: 'string', description: 'Service name' },
          custodianId: { type: 'string', format: 'uuid', description: 'Associated custodian ID' },
          custodianName: { type: 'string', description: 'Custodian name' },
          fee: { type: 'number', description: 'Service fee amount' },
          paymentFrequency: { type: 'string', enum: ['Monthly', 'Quarterly', 'Annual'], description: 'Payment frequency' },
          currencyId: { type: 'string', format: 'uuid', description: 'Currency ID' },
          currency: { type: 'string', description: 'Currency ISO code' },
          minWeight: { type: 'number', nullable: true, description: 'Minimum weight requirement' },
          maxWeight: { type: 'number', nullable: true, description: 'Maximum weight limit' },
          createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
          updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' }
        }
      },
      CustodyServiceCreateRequest: {
        type: 'object',
        required: ['custodyServiceName', 'custodianId', 'fee', 'paymentFrequency', 'currencyId'],
        properties: {
          custodyServiceName: { type: 'string', minLength: 1, description: 'Service name' },
          custodianId: { type: 'string', format: 'uuid', description: 'Custodian ID' },
          fee: { type: 'number', minimum: 0, description: 'Service fee' },
          paymentFrequency: { type: 'string', enum: ['Monthly', 'Quarterly', 'Annual'], description: 'Payment frequency' },
          currencyId: { type: 'string', format: 'uuid', description: 'Currency ID' },
          minWeight: { type: 'number', nullable: true, description: 'Minimum weight' },
          maxWeight: { type: 'number', nullable: true, description: 'Maximum weight' }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

const options = {
  swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/routes/*.js',
    './dist/routes/*.js'
  ]
};

export const swaggerSpec = swaggerJSDoc(options);

// Middleware to add dynamic server URL based on request
export function updateSwaggerSpec(req: Request) {
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}/api`;
  
  const spec = swaggerSpec as any;
  
  return {
    ...spec,
    servers: [
      {
        url: baseUrl,
        description: 'Current server'
      },
      ...(spec.servers || [])
    ]
  };
}
