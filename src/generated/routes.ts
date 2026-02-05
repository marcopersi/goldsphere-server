/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { UserController } from './../controllers/UserController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TransactionsController } from './../controllers/TransactionsController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { RegistrationController } from './../controllers/RegistrationController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ReferenceDataController } from './../controllers/ReferenceDataController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ProductTypesController } from './../controllers/ProductTypesController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ProductController } from './../controllers/ProductController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ProducersController } from './../controllers/ProducersController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PositionsController } from './../controllers/PositionsController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PortfolioController } from './../controllers/PortfolioController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PaymentsController } from './../controllers/PaymentsController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { OrdersController } from './../controllers/OrdersController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { OrderStatusController } from './../controllers/OrderStatusController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MetalsController } from './../controllers/MetalsController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { MarketDataController } from './../controllers/MarketDataController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { LbmaController } from './../controllers/LbmaController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CustodyServiceController } from './../controllers/CustodyServiceController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CustodiansController } from './../controllers/CustodiansController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CurrenciesController } from './../controllers/CurrenciesController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CountriesController } from './../controllers/CountriesController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AuthController } from './../controllers/AuthController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AdminController } from './../controllers/AdminController';
import { expressAuthentication } from './../middleware/tsoaAuth';
// @ts-ignore - no great way to install types from subpackage
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';
const multer = require('multer');


const expressAuthenticationRecasted = expressAuthentication as (req: ExRequest, securityName: string, scopes?: string[], res?: ExResponse) => Promise<any>;


// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "UserResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "email": {"dataType":"string","required":true},
            "role": {"dataType":"string","required":true},
            "emailVerified": {"dataType":"boolean"},
            "createdAt": {"dataType":"datetime"},
            "updatedAt": {"dataType":"datetime"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserListResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"array","array":{"dataType":"refObject","ref":"UserResponse"},"required":true},
            "pagination": {"dataType":"nestedObjectLiteral","nestedProperties":{"totalPages":{"dataType":"double","required":true},"totalCount":{"dataType":"double","required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "code": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BlockedUserResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "email": {"dataType":"string","required":true},
            "accountStatus": {"dataType":"string","required":true},
            "blockedAt": {"dataType":"union","subSchemas":[{"dataType":"datetime"},{"dataType":"enum","enums":[null]}]},
            "blockedBy": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "blockReason": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponseWrapper_BlockedUserResponse-Array_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"array","array":{"dataType":"refObject","ref":"BlockedUserResponse"},"required":true},
            "message": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponseWrapper_UserResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"UserResponse","required":true},
            "message": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserProfileData": {
        "dataType": "refObject",
        "properties": {
            "title": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "firstName": {"dataType":"string"},
            "lastName": {"dataType":"string"},
            "birthDate": {"dataType":"datetime"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserAddressData": {
        "dataType": "refObject",
        "properties": {
            "countryId": {"dataType":"string"},
            "postalCode": {"dataType":"string"},
            "city": {"dataType":"string"},
            "state": {"dataType":"string"},
            "street": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "VerificationStatusData": {
        "dataType": "refObject",
        "properties": {
            "emailStatus": {"dataType":"string"},
            "identityStatus": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserDetailsResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"verificationStatus":{"dataType":"union","subSchemas":[{"ref":"VerificationStatusData"},{"dataType":"enum","enums":[null]}],"required":true},"address":{"dataType":"union","subSchemas":[{"ref":"UserAddressData"},{"dataType":"enum","enums":[null]}],"required":true},"profile":{"dataType":"union","subSchemas":[{"ref":"UserProfileData"},{"dataType":"enum","enums":[null]}],"required":true},"user":{"ref":"UserResponse","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateUserRequest": {
        "dataType": "refObject",
        "properties": {
            "email": {"dataType":"string","required":true},
            "password": {"dataType":"string","required":true},
            "role": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["admin"]},{"dataType":"enum","enums":["user"]},{"dataType":"enum","enums":["advisor"]},{"dataType":"enum","enums":["investor"]}]},
            "title": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["Herr"]},{"dataType":"enum","enums":["Frau"]},{"dataType":"enum","enums":["Divers"]}]},
            "firstName": {"dataType":"string"},
            "lastName": {"dataType":"string"},
            "birthDate": {"dataType":"datetime"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateUserRequest": {
        "dataType": "refObject",
        "properties": {
            "email": {"dataType":"string"},
            "password": {"dataType":"string"},
            "role": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["admin"]},{"dataType":"enum","enums":["user"]},{"dataType":"enum","enums":["advisor"]},{"dataType":"enum","enums":["investor"]}]},
            "emailVerified": {"dataType":"boolean"},
            "identityVerified": {"dataType":"boolean"},
            "title": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["Herr"]},{"dataType":"enum","enums":["Frau"]},{"dataType":"enum","enums":["Divers"]}]},
            "firstName": {"dataType":"string"},
            "lastName": {"dataType":"string"},
            "birthDate": {"dataType":"datetime"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SuccessResponseWrapper_BlockedUserResponse_": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"BlockedUserResponse","required":true},
            "message": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BlockUserRequest": {
        "dataType": "refObject",
        "properties": {
            "reason": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TransactionItem": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "positionId": {"dataType":"string","required":true},
            "userId": {"dataType":"string","required":true},
            "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["buy"]},{"dataType":"enum","enums":["sell"]}],"required":true},
            "date": {"dataType":"datetime","required":true},
            "quantity": {"dataType":"double","required":true},
            "price": {"dataType":"double","required":true},
            "fees": {"dataType":"double","required":true},
            "notes": {"dataType":"string"},
            "createdAt": {"dataType":"datetime","required":true},
            "total": {"dataType":"double","required":true},
            "productName": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TransactionsPaginationInfo": {
        "dataType": "refObject",
        "properties": {
            "page": {"dataType":"double","required":true},
            "limit": {"dataType":"double","required":true},
            "total": {"dataType":"double","required":true},
            "totalPages": {"dataType":"double","required":true},
            "hasNext": {"dataType":"boolean","required":true},
            "hasPrev": {"dataType":"boolean","required":true},
            "offset": {"dataType":"double","required":true},
            "showing": {"dataType":"double","required":true},
            "from": {"dataType":"double","required":true},
            "to": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TransactionsSummary": {
        "dataType": "refObject",
        "properties": {
            "totalQuantity": {"dataType":"double","required":true},
            "buyTransactions": {"dataType":"double","required":true},
            "sellTransactions": {"dataType":"double","required":true},
            "averagePrice": {"dataType":"double","required":true},
            "totalFees": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TransactionsListResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"array","array":{"dataType":"refObject","ref":"TransactionItem"},"required":true},
            "pagination": {"ref":"TransactionsPaginationInfo","required":true},
            "summary": {"ref":"TransactionsSummary","required":true},
            "filters": {"dataType":"nestedObjectLiteral","nestedProperties":{"sortOrder":{"dataType":"string","required":true},"sortBy":{"dataType":"string","required":true},"maxPrice":{"dataType":"double"},"minPrice":{"dataType":"double"},"maxQuantity":{"dataType":"double"},"minQuantity":{"dataType":"double"},"dateTo":{"dataType":"string"},"dateFrom":{"dataType":"string"},"positionId":{"dataType":"string"},"type":{"dataType":"string"}},"required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TransactionsErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"string"},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProductInfo": {
        "dataType": "refObject",
        "properties": {
            "productId": {"dataType":"string","required":true},
            "productName": {"dataType":"string","required":true},
            "currentPrice": {"dataType":"double","required":true},
            "type": {"dataType":"string","required":true},
            "metal": {"dataType":"string","required":true},
            "weight": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "TransactionCreateResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"summary":{"dataType":"nestedObjectLiteral","nestedProperties":{"priceComparison":{"dataType":"nestedObjectLiteral","nestedProperties":{"priceChangePercent":{"dataType":"double","required":true},"priceDifference":{"dataType":"double","required":true},"currentMarketPrice":{"dataType":"double","required":true}}},"feesPercentage":{"dataType":"double","required":true},"transactionValue":{"dataType":"double","required":true}},"required":true},"productInfo":{"ref":"ProductInfo"},"total":{"dataType":"double","required":true},"createdAt":{"dataType":"string","required":true},"notes":{"dataType":"string"},"fees":{"dataType":"double","required":true},"price":{"dataType":"double","required":true},"quantity":{"dataType":"double","required":true},"date":{"dataType":"string","required":true},"type":{"dataType":"string","required":true},"userId":{"dataType":"string","required":true},"positionId":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true},
            "message": {"dataType":"string","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateTransactionRequest": {
        "dataType": "refObject",
        "properties": {
            "positionId": {"dataType":"string","required":true},
            "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["buy"]},{"dataType":"enum","enums":["sell"]}],"required":true},
            "date": {"dataType":"string","required":true},
            "quantity": {"dataType":"double","required":true},
            "price": {"dataType":"double","required":true},
            "fees": {"dataType":"double"},
            "notes": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserTitle": {
        "dataType": "refEnum",
        "enums": ["Herr","Frau","Divers"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Address": {
        "dataType": "refObject",
        "properties": {
            "countryId": {"dataType":"string","required":true},
            "postalCode": {"dataType":"string","required":true},
            "city": {"dataType":"string","required":true},
            "state": {"dataType":"string","required":true},
            "street": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EmailVerificationStatus": {
        "dataType": "refEnum",
        "enums": ["pending","verified","failed"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "IdentityVerificationStatus": {
        "dataType": "refEnum",
        "enums": ["pending","verified","failed","rejected"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UserProfile": {
        "dataType": "refObject",
        "properties": {
            "title": {"dataType":"union","subSchemas":[{"ref":"UserTitle"},{"dataType":"enum","enums":[null]}],"required":true},
            "firstName": {"dataType":"string","required":true},
            "lastName": {"dataType":"string","required":true},
            "birthDate": {"dataType":"string","required":true},
            "address": {"ref":"Address","required":true},
            "createdAt": {"dataType":"string","required":true},
            "verificationStatus": {"dataType":"nestedObjectLiteral","nestedProperties":{"identity":{"ref":"IdentityVerificationStatus","required":true},"email":{"ref":"EmailVerificationStatus","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RegisteredUser": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "email": {"dataType":"string","required":true},
            "role": {"dataType":"string","required":true},
            "profile": {"ref":"UserProfile","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EnhancedRegistrationResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "user": {"ref":"RegisteredUser","required":true},
            "token": {"dataType":"string","required":true},
            "expiresAt": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RegistrationErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "code": {"dataType":"string","required":true},
            "details": {"dataType":"any"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PersonalInfo": {
        "dataType": "refObject",
        "properties": {
            "title": {"dataType":"union","subSchemas":[{"ref":"UserTitle"},{"dataType":"enum","enums":[null]}],"required":true},
            "firstName": {"dataType":"string","required":true},
            "lastName": {"dataType":"string","required":true},
            "birthDate": {"dataType":"string","required":true},
            "email": {"dataType":"string","required":true},
            "password": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Record_string.unknown_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{},"additionalProperties":{"dataType":"any"},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DocumentInfo": {
        "dataType": "refObject",
        "properties": {
            "wasProcessed": {"dataType":"boolean","required":true},
            "originalFilename": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "extractedFields": {"ref":"Record_string.unknown_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Consent": {
        "dataType": "refObject",
        "properties": {
            "agreeToTerms": {"dataType":"boolean","required":true},
            "termsVersion": {"dataType":"string","required":true},
            "consentTimestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EnhancedRegistrationRequest": {
        "dataType": "refObject",
        "properties": {
            "personalInfo": {"ref":"PersonalInfo","required":true},
            "address": {"ref":"Address","required":true},
            "documentInfo": {"ref":"DocumentInfo"},
            "consent": {"ref":"Consent","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "EmailCheckResponse": {
        "dataType": "refObject",
        "properties": {
            "exists": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ResendVerificationResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ResendVerificationRequest": {
        "dataType": "refObject",
        "properties": {
            "email": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ReferenceData": {
        "dataType": "refObject",
        "properties": {
            "metals": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"name":{"dataType":"string","required":true},"symbol":{"dataType":"string","required":true}}},"required":true},
            "productTypes": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"name":{"dataType":"string","required":true}}},"required":true},
            "countries": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"name":{"dataType":"string","required":true},"code":{"dataType":"string","required":true}}},"required":true},
            "producers": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"required":true},
            "currencies": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"isoNumericCode":{"dataType":"double","required":true},"isoCode3":{"dataType":"string","required":true},"isoCode2":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"required":true},
            "custodians": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"name":{"dataType":"string","required":true},"value":{"dataType":"string","required":true}}},"required":true},
            "paymentFrequencies": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"description":{"dataType":"string","required":true},"displayName":{"dataType":"string","required":true},"value":{"dataType":"string","required":true}}},"required":true},
            "custodyServiceTypes": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"description":{"dataType":"string","required":true},"displayName":{"dataType":"string","required":true},"value":{"dataType":"string","required":true}}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ReferenceDataResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "data": {"ref":"ReferenceData","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ReferenceDataErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProductTypeResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginationResponse": {
        "dataType": "refObject",
        "properties": {
            "page": {"dataType":"double","required":true},
            "limit": {"dataType":"double","required":true},
            "total": {"dataType":"double","required":true},
            "totalPages": {"dataType":"double","required":true},
            "hasNext": {"dataType":"boolean","required":true},
            "hasPrevious": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProductTypesListResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"pagination":{"ref":"PaginationResponse","required":true},"items":{"dataType":"array","array":{"dataType":"refObject","ref":"ProductTypeResponse"},"required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProductTypesErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProductTypeRequest": {
        "dataType": "refObject",
        "properties": {
            "productTypeName": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProductApiResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "type": {"dataType":"string","required":true},
            "productTypeId": {"dataType":"string","required":true},
            "metal": {"dataType":"string","required":true},
            "metalId": {"dataType":"string","required":true},
            "weight": {"dataType":"double","required":true},
            "weightUnit": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["grams"]},{"dataType":"enum","enums":["troy_ounces"]},{"dataType":"enum","enums":["kilograms"]}],"required":true},
            "purity": {"dataType":"double","required":true},
            "price": {"dataType":"double","required":true},
            "currency": {"dataType":"string","required":true},
            "producerId": {"dataType":"string","required":true},
            "producer": {"dataType":"string","required":true},
            "country": {"dataType":"string","required":true},
            "year": {"dataType":"double"},
            "description": {"dataType":"string"},
            "certifiedProvenance": {"dataType":"boolean","required":true},
            "imageUrl": {"dataType":"string","required":true},
            "inStock": {"dataType":"boolean","required":true},
            "stockQuantity": {"dataType":"double","required":true},
            "minimumOrderQuantity": {"dataType":"double","required":true},
            "premiumPercentage": {"dataType":"double"},
            "diameter": {"dataType":"double"},
            "thickness": {"dataType":"double"},
            "mintage": {"dataType":"double"},
            "certification": {"dataType":"string"},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProductListApiResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"pagination":{"dataType":"nestedObjectLiteral","nestedProperties":{"totalPages":{"dataType":"double","required":true},"total":{"dataType":"double","required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"required":true},"items":{"dataType":"array","array":{"dataType":"refObject","ref":"ProductApiResponse"},"required":true}},"required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProductErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"any"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProductSingleResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "data": {"ref":"ProductApiResponse","required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProductPriceDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "price": {"dataType":"double","required":true},
            "currency": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProductPriceResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "data": {"ref":"ProductPriceDTO","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProductPricesResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "data": {"dataType":"array","array":{"dataType":"refObject","ref":"ProductPriceDTO"},"required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "BulkPriceRequest": {
        "dataType": "refObject",
        "properties": {
            "productIds": {"dataType":"array","array":{"dataType":"string"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateProductRequest": {
        "dataType": "refObject",
        "properties": {
            "productName": {"dataType":"string","required":true},
            "productTypeId": {"dataType":"string","required":true,"validators":{"pattern":{"errorMsg":"UUID format required","value":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"}}},
            "metalId": {"dataType":"string","required":true,"validators":{"pattern":{"errorMsg":"UUID format required","value":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"}}},
            "producerId": {"dataType":"string","required":true,"validators":{"pattern":{"errorMsg":"UUID format required","value":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"}}},
            "countryId": {"dataType":"string","validators":{"pattern":{"errorMsg":"UUID format required","value":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"}}},
            "fineWeight": {"dataType":"double","required":true},
            "unitOfMeasure": {"dataType":"string","required":true},
            "purity": {"dataType":"double","validators":{"minimum":{"value":0},"maximum":{"value":1}}},
            "price": {"dataType":"double","required":true},
            "currency": {"dataType":"string","required":true},
            "productYear": {"dataType":"double"},
            "description": {"dataType":"string"},
            "imageFilename": {"dataType":"string"},
            "inStock": {"dataType":"boolean"},
            "stockQuantity": {"dataType":"double"},
            "minimumOrderQuantity": {"dataType":"double"},
            "premiumPercentage": {"dataType":"double"},
            "diameter": {"dataType":"double"},
            "thickness": {"dataType":"double"},
            "mintage": {"dataType":"double"},
            "certification": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateProductRequest": {
        "dataType": "refObject",
        "properties": {
            "productName": {"dataType":"string"},
            "productTypeId": {"dataType":"string"},
            "metalId": {"dataType":"string"},
            "producerId": {"dataType":"string"},
            "countryId": {"dataType":"string"},
            "fineWeight": {"dataType":"double"},
            "unitOfMeasure": {"dataType":"string"},
            "purity": {"dataType":"double"},
            "price": {"dataType":"double"},
            "currency": {"dataType":"string"},
            "productYear": {"dataType":"double"},
            "description": {"dataType":"string"},
            "imageFilename": {"dataType":"string"},
            "inStock": {"dataType":"boolean"},
            "stockQuantity": {"dataType":"double"},
            "minimumOrderQuantity": {"dataType":"double"},
            "premiumPercentage": {"dataType":"double"},
            "diameter": {"dataType":"double"},
            "thickness": {"dataType":"double"},
            "mintage": {"dataType":"double"},
            "certification": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProductDeleteResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidationResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"validatedData":{"dataType":"any","required":true},"schemaType":{"dataType":"string","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ImageUploadRequest": {
        "dataType": "refObject",
        "properties": {
            "imageBase64": {"dataType":"string","required":true},
            "contentType": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["image/jpeg"]},{"dataType":"enum","enums":["image/jpg"]},{"dataType":"enum","enums":["image/png"]},{"dataType":"enum","enums":["image/gif"]},{"dataType":"enum","enums":["image/webp"]}],"required":true},
            "filename": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProducerRow": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "producerName": {"dataType":"string","required":true},
            "status": {"dataType":"string","required":true},
            "countryId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "websiteURL": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaginationInfo": {
        "dataType": "refObject",
        "properties": {
            "page": {"dataType":"double","required":true},
            "limit": {"dataType":"double","required":true},
            "total": {"dataType":"double","required":true},
            "totalPages": {"dataType":"double","required":true},
            "hasNext": {"dataType":"boolean","required":true},
            "hasPrevious": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProducersListResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"pagination":{"ref":"PaginationInfo","required":true},"items":{"dataType":"array","array":{"dataType":"refObject","ref":"ProducerRow"},"required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProducersErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"any"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProducersApiResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"ProducerRow","required":true},
            "message": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofProducerCreateRequestSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"websiteURL":{"dataType":"string"},"status":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["active"]},{"dataType":"enum","enums":["inactive"]}]},"countryId":{"dataType":"string"},"producerName":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofProducerUpdateRequestSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"websiteURL":{"dataType":"string"},"status":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["active"]},{"dataType":"enum","enums":["inactive"]}]},"countryId":{"dataType":"string"},"producerName":{"dataType":"string"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PositionsProductInfo": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "type": {"dataType":"string","required":true},
            "metal": {"dataType":"string","required":true},
            "weight": {"dataType":"double","required":true},
            "weightUnit": {"dataType":"string","required":true},
            "purity": {"dataType":"double","required":true},
            "price": {"dataType":"double","required":true},
            "currency": {"dataType":"string","required":true},
            "producer": {"dataType":"string","required":true},
            "country": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "year": {"dataType":"double"},
            "description": {"dataType":"string","required":true},
            "imageUrl": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "inStock": {"dataType":"boolean","required":true},
            "minimumOrderQuantity": {"dataType":"double","required":true},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PositionsCustodyInfo": {
        "dataType": "refObject",
        "properties": {
            "custodyServiceId": {"dataType":"string","required":true},
            "custodyServiceName": {"dataType":"string","required":true},
            "custodianId": {"dataType":"string","required":true},
            "custodianName": {"dataType":"string","required":true},
            "fee": {"dataType":"double","required":true},
            "paymentFrequency": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PositionDetail": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "userId": {"dataType":"string","required":true},
            "productId": {"dataType":"string","required":true},
            "portfolioId": {"dataType":"string","required":true},
            "product": {"ref":"PositionsProductInfo","required":true},
            "purchaseDate": {"dataType":"datetime","required":true},
            "purchasePrice": {"dataType":"double","required":true},
            "marketPrice": {"dataType":"double","required":true},
            "quantity": {"dataType":"double","required":true},
            "custodyServiceId": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
            "custody": {"dataType":"union","subSchemas":[{"ref":"PositionsCustodyInfo"},{"dataType":"enum","enums":[null]}],"required":true},
            "status": {"dataType":"string","required":true},
            "notes": {"dataType":"string","required":true},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PositionsPaginationInfo": {
        "dataType": "refObject",
        "properties": {
            "page": {"dataType":"double","required":true},
            "limit": {"dataType":"double","required":true},
            "total": {"dataType":"double","required":true},
            "totalPages": {"dataType":"double","required":true},
            "hasNext": {"dataType":"boolean","required":true},
            "hasPrev": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PositionsListResponse": {
        "dataType": "refObject",
        "properties": {
            "positions": {"dataType":"array","array":{"dataType":"refObject","ref":"PositionDetail"},"required":true},
            "pagination": {"ref":"PositionsPaginationInfo","required":true},
            "filters": {"dataType":"nestedObjectLiteral","nestedProperties":{"status":{"dataType":"string","required":true}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PositionsErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PortfolioSummary": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "portfolioName": {"dataType":"string","required":true},
            "ownerId": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "isActive": {"dataType":"boolean","required":true},
            "totalValue": {"dataType":"double","required":true},
            "totalCost": {"dataType":"double","required":true},
            "totalGainLoss": {"dataType":"double","required":true},
            "totalGainLossPercentage": {"dataType":"double","required":true},
            "positionCount": {"dataType":"double","required":true},
            "lastUpdated": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"datetime"}],"required":true},
            "createdAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"datetime"}],"required":true},
            "updatedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"datetime"}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PortfolioListResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"pagination":{"dataType":"nestedObjectLiteral","nestedProperties":{"totalPages":{"dataType":"double","required":true},"total":{"dataType":"double","required":true},"limit":{"dataType":"double","required":true},"page":{"dataType":"double","required":true}},"required":true},"portfolios":{"dataType":"array","array":{"dataType":"refObject","ref":"PortfolioSummary"},"required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PortfolioErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string"},
            "message": {"dataType":"string"},
            "errors": {"dataType":"array","array":{"dataType":"any"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofPositionSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"custody":{"dataType":"nestedObjectLiteral","nestedProperties":{"paymentFrequency":{"dataType":"string","required":true},"fee":{"dataType":"double","required":true},"custodianName":{"dataType":"string","required":true},"custodianId":{"dataType":"string","required":true},"custodyServiceName":{"dataType":"string","required":true},"custodyServiceId":{"dataType":"string","required":true}}},"custodyServiceId":{"dataType":"string"},"notes":{"dataType":"string"},"closedDate":{"dataType":"datetime"},"updatedAt":{"dataType":"datetime","required":true},"createdAt":{"dataType":"datetime","required":true},"status":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["active"]},{"dataType":"enum","enums":["closed"]}],"required":true},"quantity":{"dataType":"double","required":true},"marketPrice":{"dataType":"double","required":true},"purchasePrice":{"dataType":"double","required":true},"purchaseDate":{"dataType":"datetime","required":true},"product":{"dataType":"nestedObjectLiteral","nestedProperties":{"certification":{"dataType":"string"},"mintage":{"dataType":"double"},"thickness":{"dataType":"double"},"diameter":{"dataType":"double"},"stockQuantity":{"dataType":"double"},"imageFilename":{"dataType":"string"},"description":{"dataType":"string"},"year":{"dataType":"double"},"premiumPercentage":{"dataType":"double"},"countryId":{"dataType":"string"},"country":{"dataType":"string"},"updatedAt":{"dataType":"datetime","required":true},"createdAt":{"dataType":"datetime","required":true},"minimumOrderQuantity":{"dataType":"double","required":true},"inStock":{"dataType":"boolean","required":true},"imageUrl":{"dataType":"string","required":true},"certifiedProvenance":{"dataType":"boolean","required":true},"currency":{"dataType":"string","required":true},"price":{"dataType":"double","required":true},"purity":{"dataType":"double","required":true},"weightUnit":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["grams"]},{"dataType":"enum","enums":["troy_ounces"]},{"dataType":"enum","enums":["kilograms"]}],"required":true},"weight":{"dataType":"double","required":true},"producerId":{"dataType":"string","required":true},"producer":{"dataType":"string","required":true},"metalId":{"dataType":"string","required":true},"metal":{"dataType":"nestedObjectLiteral","nestedProperties":{"symbol":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true},"productTypeId":{"dataType":"string","required":true},"type":{"dataType":"string","required":true},"name":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"required":true},"portfolioId":{"dataType":"string","required":true},"productId":{"dataType":"string","required":true},"userId":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Position": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofPositionSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PortfolioWithPositions": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "portfolioName": {"dataType":"string","required":true},
            "ownerId": {"dataType":"string","required":true},
            "description": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}]},
            "isActive": {"dataType":"boolean","required":true},
            "totalValue": {"dataType":"double","required":true},
            "totalCost": {"dataType":"double","required":true},
            "totalGainLoss": {"dataType":"double","required":true},
            "totalGainLossPercentage": {"dataType":"double","required":true},
            "positionCount": {"dataType":"double","required":true},
            "lastUpdated": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"datetime"}],"required":true},
            "createdAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"datetime"}],"required":true},
            "updatedAt": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"datetime"}],"required":true},
            "positions": {"dataType":"array","array":{"dataType":"refAlias","ref":"Position"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PortfolioArrayResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"array","array":{"dataType":"refObject","ref":"PortfolioWithPositions"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PortfolioSingleResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"portfolio":{"ref":"PortfolioSummary","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PortfolioWithPositionsResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"PortfolioWithPositions","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreatePortfolioRequest": {
        "dataType": "refObject",
        "properties": {
            "portfolioName": {"dataType":"string","required":true},
            "ownerId": {"dataType":"string","required":true},
            "description": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdatePortfolioRequest": {
        "dataType": "refObject",
        "properties": {
            "portfolioName": {"dataType":"string"},
            "description": {"dataType":"string"},
            "isActive": {"dataType":"boolean"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PortfolioDeleteResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Record_string.string_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofCreatePaymentIntentResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"error":{"dataType":"nestedObjectLiteral","nestedProperties":{"declineCode":{"dataType":"string"},"param":{"dataType":"string"},"type":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["validation_error"]},{"dataType":"enum","enums":["card_error"]},{"dataType":"enum","enums":["api_error"]},{"dataType":"enum","enums":["authentication_error"]}],"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"string","required":true}}},"paymentIntent":{"dataType":"nestedObjectLiteral","nestedProperties":{"refundedAmount":{"dataType":"double"},"refunded":{"dataType":"boolean"},"fees":{"dataType":"double"},"amountReceived":{"dataType":"double"},"metadata":{"ref":"Record_string.string_"},"paymentMethodId":{"dataType":"string"},"customerId":{"dataType":"string"},"orderId":{"dataType":"string"},"updatedAt":{"dataType":"datetime","required":true},"createdAt":{"dataType":"datetime","required":true},"status":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["processing"]},{"dataType":"enum","enums":["requires_payment_method"]},{"dataType":"enum","enums":["requires_confirmation"]},{"dataType":"enum","enums":["requires_action"]},{"dataType":"enum","enums":["succeeded"]},{"dataType":"enum","enums":["canceled"]},{"dataType":"enum","enums":["requires_capture"]}],"required":true},"currency":{"dataType":"string","required":true},"amount":{"dataType":"double","required":true},"clientSecret":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"success":{"dataType":"boolean","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreatePaymentIntentResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofCreatePaymentIntentResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofPaymentErrorSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"declineCode":{"dataType":"string"},"param":{"dataType":"string"},"type":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["validation_error"]},{"dataType":"enum","enums":["card_error"]},{"dataType":"enum","enums":["api_error"]},{"dataType":"enum","enums":["authentication_error"]}],"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"string","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaymentError": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofPaymentErrorSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaymentErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"ref":"PaymentError","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofCreatePaymentIntentRequestSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"metadata":{"ref":"Record_string.string_"},"description":{"dataType":"string"},"automaticPaymentMethods":{"dataType":"nestedObjectLiteral","nestedProperties":{"allowRedirects":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["never"]},{"dataType":"enum","enums":["always"]}]},"enabled":{"dataType":"boolean","required":true}}},"paymentMethodId":{"dataType":"string"},"customerId":{"dataType":"string"},"orderId":{"dataType":"string","required":true},"currency":{"dataType":"string","required":true},"amount":{"dataType":"double","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreatePaymentIntentRequest": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofCreatePaymentIntentRequestSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofConfirmPaymentResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"nextAction":{"dataType":"nestedObjectLiteral","nestedProperties":{"redirectToUrl":{"dataType":"string"},"type":{"dataType":"string","required":true}}},"requiresAction":{"dataType":"boolean"},"error":{"dataType":"nestedObjectLiteral","nestedProperties":{"declineCode":{"dataType":"string"},"param":{"dataType":"string"},"type":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["validation_error"]},{"dataType":"enum","enums":["card_error"]},{"dataType":"enum","enums":["api_error"]},{"dataType":"enum","enums":["authentication_error"]}],"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"string","required":true}}},"paymentIntent":{"dataType":"nestedObjectLiteral","nestedProperties":{"refundedAmount":{"dataType":"double"},"refunded":{"dataType":"boolean"},"fees":{"dataType":"double"},"amountReceived":{"dataType":"double"},"metadata":{"ref":"Record_string.string_"},"paymentMethodId":{"dataType":"string"},"customerId":{"dataType":"string"},"orderId":{"dataType":"string"},"updatedAt":{"dataType":"datetime","required":true},"createdAt":{"dataType":"datetime","required":true},"status":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["processing"]},{"dataType":"enum","enums":["requires_payment_method"]},{"dataType":"enum","enums":["requires_confirmation"]},{"dataType":"enum","enums":["requires_action"]},{"dataType":"enum","enums":["succeeded"]},{"dataType":"enum","enums":["canceled"]},{"dataType":"enum","enums":["requires_capture"]}],"required":true},"currency":{"dataType":"string","required":true},"amount":{"dataType":"double","required":true},"clientSecret":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"success":{"dataType":"boolean","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ConfirmPaymentResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofConfirmPaymentResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Partial_ConfirmPaymentRequest_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"paymentIntentId":{"dataType":"string"},"paymentMethodId":{"dataType":"string"},"returnUrl":{"dataType":"string"},"useStripeSdk":{"dataType":"boolean"}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofRetrievePaymentIntentResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"error":{"dataType":"nestedObjectLiteral","nestedProperties":{"declineCode":{"dataType":"string"},"param":{"dataType":"string"},"type":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["validation_error"]},{"dataType":"enum","enums":["card_error"]},{"dataType":"enum","enums":["api_error"]},{"dataType":"enum","enums":["authentication_error"]}],"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"string","required":true}}},"paymentIntent":{"dataType":"nestedObjectLiteral","nestedProperties":{"refundedAmount":{"dataType":"double"},"refunded":{"dataType":"boolean"},"fees":{"dataType":"double"},"amountReceived":{"dataType":"double"},"metadata":{"ref":"Record_string.string_"},"paymentMethodId":{"dataType":"string"},"customerId":{"dataType":"string"},"orderId":{"dataType":"string"},"updatedAt":{"dataType":"datetime","required":true},"createdAt":{"dataType":"datetime","required":true},"status":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["processing"]},{"dataType":"enum","enums":["requires_payment_method"]},{"dataType":"enum","enums":["requires_confirmation"]},{"dataType":"enum","enums":["requires_action"]},{"dataType":"enum","enums":["succeeded"]},{"dataType":"enum","enums":["canceled"]},{"dataType":"enum","enums":["requires_capture"]}],"required":true},"currency":{"dataType":"string","required":true},"amount":{"dataType":"double","required":true},"clientSecret":{"dataType":"string","required":true},"id":{"dataType":"string","required":true}}},"success":{"dataType":"boolean","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RetrievePaymentIntentResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofRetrievePaymentIntentResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "infer_typeofListPaymentMethodsResponseSchema_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{"error":{"dataType":"nestedObjectLiteral","nestedProperties":{"declineCode":{"dataType":"string"},"param":{"dataType":"string"},"type":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["validation_error"]},{"dataType":"enum","enums":["card_error"]},{"dataType":"enum","enums":["api_error"]},{"dataType":"enum","enums":["authentication_error"]}],"required":true},"message":{"dataType":"string","required":true},"code":{"dataType":"string","required":true}}},"hasMore":{"dataType":"boolean"},"paymentMethods":{"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"accountLast4":{"dataType":"string"},"bankName":{"dataType":"string"},"expiryYear":{"dataType":"double"},"expiryMonth":{"dataType":"double"},"brand":{"dataType":"string"},"last4":{"dataType":"string"},"isDefault":{"dataType":"boolean"},"updatedAt":{"dataType":"datetime","required":true},"createdAt":{"dataType":"datetime","required":true},"type":{"dataType":"union","subSchemas":[{"dataType":"enum","enums":["card"]},{"dataType":"enum","enums":["bank_transfer"]},{"dataType":"enum","enums":["sepa_debit"]}],"required":true},"id":{"dataType":"string","required":true}}}},"success":{"dataType":"boolean","required":true}},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ListPaymentMethodsResponse": {
        "dataType": "refAlias",
        "type": {"ref":"infer_typeofListPaymentMethodsResponseSchema_","validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OrdersPaginationInfo": {
        "dataType": "refObject",
        "properties": {
            "page": {"dataType":"double","required":true},
            "limit": {"dataType":"double","required":true},
            "total": {"dataType":"double","required":true},
            "totalPages": {"dataType":"double","required":true},
            "hasNext": {"dataType":"boolean","required":true},
            "hasPrevious": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OrdersListResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "orders": {"dataType":"array","array":{"dataType":"any"},"required":true},
            "pagination": {"ref":"OrdersPaginationInfo","required":true},
            "user": {"dataType":"nestedObjectLiteral","nestedProperties":{"id":{"dataType":"string","required":true}}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OrdersErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OrdersAdminStatistics": {
        "dataType": "refObject",
        "properties": {
            "totalOrders": {"dataType":"double","required":true},
            "pendingOrders": {"dataType":"double","required":true},
            "processingOrders": {"dataType":"double","required":true},
            "shippedOrders": {"dataType":"double","required":true},
            "deliveredOrders": {"dataType":"double","required":true},
            "cancelledOrders": {"dataType":"double","required":true},
            "uniqueUsers": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OrdersAdminResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "orders": {"dataType":"array","array":{"dataType":"any"},"required":true},
            "pagination": {"ref":"OrdersPaginationInfo","required":true},
            "statistics": {"ref":"OrdersAdminStatistics","required":true},
            "filters": {"dataType":"nestedObjectLiteral","nestedProperties":{"userId":{"dataType":"string"},"type":{"dataType":"string"},"status":{"dataType":"string"}}},
            "adminContext": {"dataType":"nestedObjectLiteral","nestedProperties":{"role":{"dataType":"string","required":true},"requestedBy":{"dataType":"string","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OrdersCreateResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"any","required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OrdersCreateInput": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"string","required":true},
            "items": {"dataType":"array","array":{"dataType":"nestedObjectLiteral","nestedProperties":{"quantity":{"dataType":"double","required":true},"productId":{"dataType":"string","required":true}}},"required":true},
            "custodyServiceId": {"dataType":"string"},
            "notes": {"dataType":"string"},
            "currency": {"dataType":"string"},
            "source": {"dataType":"string"},
            "userId": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OrderDetailResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"any","required":true},
            "message": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OrdersUpdateResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"any","required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OrdersUpdateInput": {
        "dataType": "refObject",
        "properties": {
            "type": {"dataType":"string"},
            "status": {"dataType":"string"},
            "notes": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OrdersDeleteResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"deletedAt":{"dataType":"string","required":true},"deletedBy":{"dataType":"string","required":true},"deletedOrderItems":{"dataType":"double","required":true},"orderId":{"dataType":"string","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OrdersCancelResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"order":{"dataType":"any","required":true},"cancelledAt":{"dataType":"string","required":true},"cancelledBy":{"dataType":"string","required":true},"newStatus":{"dataType":"string","required":true},"previousStatus":{"dataType":"string","required":true},"orderId":{"dataType":"string","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OrderStatusRow": {
        "dataType": "refObject",
        "properties": {
            "orderstatus": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "OrderStatusErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MetalResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "symbol": {"dataType":"string"},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MetalsListResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"pagination":{"ref":"PaginationResponse","required":true},"items":{"dataType":"array","array":{"dataType":"refObject","ref":"MetalResponse"},"required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MetalsErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MetalRequest": {
        "dataType": "refObject",
        "properties": {
            "metalName": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MarketPrice": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "metalId": {"dataType":"string","required":true},
            "metalSymbol": {"dataType":"string"},
            "metalName": {"dataType":"string"},
            "providerId": {"dataType":"string","required":true},
            "providerName": {"dataType":"string"},
            "pricePerTroyOz": {"dataType":"double","required":true},
            "currency": {"dataType":"string","required":true},
            "bid": {"dataType":"double"},
            "ask": {"dataType":"double"},
            "high24h": {"dataType":"double"},
            "low24h": {"dataType":"double"},
            "change24h": {"dataType":"double"},
            "changePercent24h": {"dataType":"double"},
            "timestamp": {"dataType":"datetime","required":true},
            "createdAt": {"dataType":"datetime"},
            "updatedAt": {"dataType":"datetime"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SinglePriceResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"MarketPrice","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MarketDataErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Record_string.MarketPrice_": {
        "dataType": "refAlias",
        "type": {"dataType":"nestedObjectLiteral","nestedProperties":{},"additionalProperties":{"ref":"MarketPrice"},"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MultiplePricesResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"Record_string.MarketPrice_","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PriceHistory": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "metalId": {"dataType":"string","required":true},
            "metalSymbol": {"dataType":"string"},
            "providerId": {"dataType":"string","required":true},
            "pricePerTroyOz": {"dataType":"double","required":true},
            "currency": {"dataType":"string","required":true},
            "bid": {"dataType":"double"},
            "ask": {"dataType":"double"},
            "high": {"dataType":"double"},
            "low": {"dataType":"double"},
            "open": {"dataType":"double"},
            "close": {"dataType":"double"},
            "volume": {"dataType":"double"},
            "timestamp": {"dataType":"datetime","required":true},
            "createdAt": {"dataType":"datetime"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "HistoryResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"array","array":{"dataType":"refObject","ref":"PriceHistory"},"required":true},
            "count": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PriceUpdateResult": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "provider": {"dataType":"string","required":true},
            "updatedMetals": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "errors": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "timestamp": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"PriceUpdateResult","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"array","array":{"dataType":"string"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MarketDataProvider": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "apiKeyEnvVar": {"dataType":"string","required":true},
            "baseUrl": {"dataType":"string","required":true},
            "isActive": {"dataType":"boolean","required":true},
            "rateLimitPerMinute": {"dataType":"double","required":true},
            "priority": {"dataType":"double","required":true},
            "lastSuccess": {"dataType":"datetime"},
            "lastFailure": {"dataType":"datetime"},
            "failureCount": {"dataType":"double","required":true},
            "createdAt": {"dataType":"datetime"},
            "updatedAt": {"dataType":"datetime"},
            "createdBy": {"dataType":"string"},
            "updatedBy": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ProvidersResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"array","array":{"dataType":"refObject","ref":"MarketDataProvider"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CacheCleanupResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PriceTypeCode": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["LBMA_AM"]},{"dataType":"enum","enums":["LBMA_PM"]},{"dataType":"enum","enums":["LBMA_SILVER"]},{"dataType":"enum","enums":["LBMA_PLATINUM_AM"]},{"dataType":"enum","enums":["LBMA_PLATINUM_PM"]},{"dataType":"enum","enums":["LBMA_PALLADIUM_AM"]},{"dataType":"enum","enums":["LBMA_PALLADIUM_PM"]},{"dataType":"enum","enums":["SPOT"]},{"dataType":"enum","enums":["REALTIME"]},{"dataType":"enum","enums":["BID"]},{"dataType":"enum","enums":["ASK"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PriceType": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "code": {"ref":"PriceTypeCode","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"string"},
            "isBenchmark": {"dataType":"boolean","required":true},
            "updateFrequencyMinutes": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PriceTypesResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"array","array":{"dataType":"refObject","ref":"PriceType"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LbmaErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"array","array":{"dataType":"string"}}]},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LbmaPrice": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "metalId": {"dataType":"string","required":true},
            "metalSymbol": {"dataType":"string"},
            "metalName": {"dataType":"string"},
            "priceTypeId": {"dataType":"string","required":true},
            "priceTypeCode": {"ref":"PriceTypeCode"},
            "fixingDate": {"dataType":"datetime","required":true},
            "fixingTime": {"dataType":"string","required":true},
            "priceUsd": {"dataType":"double","required":true},
            "priceGbp": {"dataType":"double"},
            "priceEur": {"dataType":"double"},
            "priceChf": {"dataType":"double"},
            "participants": {"dataType":"double"},
            "source": {"dataType":"string","required":true},
            "createdAt": {"dataType":"datetime"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SingleLbmaPriceResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"LbmaPrice","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LbmaHistoryResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"array","array":{"dataType":"refObject","ref":"LbmaPrice"},"required":true},
            "count": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FetchResultResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"endDate":{"dataType":"string"},"startDate":{"dataType":"string"},"date":{"dataType":"string"},"count":{"dataType":"double","required":true},"metal":{"dataType":"string","required":true}},"required":true},
            "errors": {"dataType":"array","array":{"dataType":"string"}},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FetchPricesRequest": {
        "dataType": "refObject",
        "properties": {
            "date": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FetchHistoricalRequest": {
        "dataType": "refObject",
        "properties": {
            "startDate": {"dataType":"string","required":true},
            "endDate": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PriceWithPremium": {
        "dataType": "refObject",
        "properties": {
            "metalSymbol": {"dataType":"string","required":true},
            "basePrice": {"dataType":"double","required":true},
            "basePriceType": {"ref":"PriceTypeCode","required":true},
            "premiumPercent": {"dataType":"double"},
            "premiumFixed": {"dataType":"double"},
            "finalPrice": {"dataType":"double","required":true},
            "currency": {"dataType":"string","required":true},
            "timestamp": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PremiumCalculationResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"intersection","subSchemas":[{"ref":"PriceWithPremium"},{"dataType":"nestedObjectLiteral","nestedProperties":{"totalFinalPrice":{"dataType":"double","required":true},"totalBasePrice":{"dataType":"double","required":true},"quantityOz":{"dataType":"double","required":true}}}],"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PremiumConfig": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"string"},
            "metalId": {"dataType":"string"},
            "metalSymbol": {"dataType":"string"},
            "basePriceTypeId": {"dataType":"string"},
            "premiumPercent": {"dataType":"double"},
            "premiumFixedAmount": {"dataType":"double"},
            "currency": {"dataType":"string","required":true},
            "minQuantityOz": {"dataType":"double"},
            "maxQuantityOz": {"dataType":"double"},
            "validFrom": {"dataType":"datetime","required":true},
            "validTo": {"dataType":"datetime"},
            "isActive": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PremiumConfigsResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"array","array":{"dataType":"refObject","ref":"PremiumConfig"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreateConfigResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"id":{"dataType":"string","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CreatePremiumConfigRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "description": {"dataType":"string"},
            "metalSymbol": {"dataType":"string"},
            "basePriceTypeId": {"dataType":"string"},
            "premiumPercent": {"dataType":"double"},
            "premiumFixedAmount": {"dataType":"double"},
            "currency": {"dataType":"string"},
            "minQuantityOz": {"dataType":"double"},
            "maxQuantityOz": {"dataType":"double"},
            "validFrom": {"dataType":"string","required":true},
            "validTo": {"dataType":"string"},
            "isActive": {"dataType":"boolean"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdateConfigResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "UpdatePremiumConfigRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string"},
            "description": {"dataType":"string"},
            "metalSymbol": {"dataType":"string"},
            "basePriceTypeId": {"dataType":"string"},
            "premiumPercent": {"dataType":"double"},
            "premiumFixedAmount": {"dataType":"double"},
            "currency": {"dataType":"string"},
            "minQuantityOz": {"dataType":"double"},
            "maxQuantityOz": {"dataType":"double"},
            "validFrom": {"dataType":"string"},
            "validTo": {"dataType":"string"},
            "isActive": {"dataType":"boolean"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CompareResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"spotTimestamp":{"dataType":"datetime","required":true},"lbmaDate":{"dataType":"datetime","required":true},"differencePercent":{"dataType":"double","required":true},"difference":{"dataType":"double","required":true},"spotPrice":{"dataType":"double","required":true},"lbmaPrice":{"dataType":"double","required":true},"currency":{"dataType":"string","required":true},"metal":{"dataType":"string","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodyServiceDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "custodyServiceName": {"dataType":"string","required":true},
            "custodianId": {"dataType":"string","required":true},
            "custodianName": {"dataType":"string","required":true},
            "fee": {"dataType":"double","required":true},
            "paymentFrequency": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["monthly"]},{"dataType":"enum","enums":["quarterly"]},{"dataType":"enum","enums":["annual"]},{"dataType":"enum","enums":["onetime"]}],"required":true},
            "currencyId": {"dataType":"string","required":true},
            "currency": {"dataType":"string","required":true},
            "minWeight": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "maxWeight": {"dataType":"union","subSchemas":[{"dataType":"double"},{"dataType":"enum","enums":[null]}],"required":true},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodyServiceListResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"array","array":{"dataType":"refObject","ref":"CustodyServiceDTO"},"required":true},
            "total": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodyErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"any"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodyPaginationInfo": {
        "dataType": "refObject",
        "properties": {
            "currentPage": {"dataType":"double","required":true},
            "itemsPerPage": {"dataType":"double","required":true},
            "totalItems": {"dataType":"double","required":true},
            "totalPages": {"dataType":"double","required":true},
            "hasNextPage": {"dataType":"boolean","required":true},
            "hasPreviousPage": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodyServicePaginatedResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"pagination":{"ref":"CustodyPaginationInfo","required":true},"custodyServices":{"dataType":"array","array":{"dataType":"refObject","ref":"CustodyServiceDTO"},"required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaymentFrequency": {
        "dataType": "refAlias",
        "type": {"dataType":"union","subSchemas":[{"dataType":"enum","enums":["monthly"]},{"dataType":"enum","enums":["quarterly"]},{"dataType":"enum","enums":["annual"]},{"dataType":"enum","enums":["onetime"]}],"validators":{}},
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodyServiceResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"CustodyServiceDTO","required":true},
            "message": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodyServiceCreateRequest": {
        "dataType": "refObject",
        "properties": {
            "serviceName": {"dataType":"string","required":true},
            "custodianId": {"dataType":"string","required":true},
            "fee": {"dataType":"double","required":true},
            "paymentFrequency": {"ref":"PaymentFrequency","required":true},
            "currency": {"dataType":"string","required":true},
            "maxWeight": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodyServiceUpdateRequest": {
        "dataType": "refObject",
        "properties": {
            "serviceName": {"dataType":"string"},
            "custodianId": {"dataType":"string"},
            "fee": {"dataType":"double"},
            "paymentFrequency": {"ref":"PaymentFrequency"},
            "currency": {"dataType":"string"},
            "maxWeight": {"dataType":"double"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodyServiceDeleteResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodianWithServices": {
        "dataType": "refObject",
        "properties": {
            "custodianId": {"dataType":"string","required":true},
            "custodianName": {"dataType":"string","required":true},
            "services": {"dataType":"array","array":{"dataType":"refObject","ref":"CustodyServiceDTO"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodiansWithServicesResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"array","array":{"dataType":"refObject","ref":"CustodianWithServices"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodianDTO": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "name": {"dataType":"string","required":true},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodianListResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"array","array":{"dataType":"refObject","ref":"CustodianDTO"},"required":true},
            "total": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodianErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"any"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodianPaginationInfo": {
        "dataType": "refObject",
        "properties": {
            "currentPage": {"dataType":"double","required":true},
            "itemsPerPage": {"dataType":"double","required":true},
            "totalItems": {"dataType":"double","required":true},
            "totalPages": {"dataType":"double","required":true},
            "hasNextPage": {"dataType":"boolean","required":true},
            "hasPreviousPage": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodianPaginatedResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"pagination":{"ref":"CustodianPaginationInfo","required":true},"custodians":{"dataType":"array","array":{"dataType":"refObject","ref":"CustodianDTO"},"required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodianResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "data": {"ref":"CustodianDTO","required":true},
            "message": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodianCreateRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodianUpdateRequest": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CustodianDeleteResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Currency": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "isoCode2": {"dataType":"string","required":true},
            "isoCode3": {"dataType":"string","required":true},
            "isoNumericCode": {"dataType":"double","required":true},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CurrenciesErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CurrencyRequest": {
        "dataType": "refObject",
        "properties": {
            "isoCode2": {"dataType":"string","required":true},
            "isoCode3": {"dataType":"string","required":true},
            "isoNumericCode": {"dataType":"double","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Country": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "countryName": {"dataType":"string","required":true},
            "isoCode2": {"dataType":"string","required":true},
            "createdAt": {"dataType":"datetime","required":true},
            "updatedAt": {"dataType":"datetime","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CountriesErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CountryRequest": {
        "dataType": "refObject",
        "properties": {
            "countryName": {"dataType":"string","required":true},
            "isoCode2": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuthUserResponse": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"string","required":true},
            "email": {"dataType":"string","required":true},
            "role": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LoginSuccessResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "token": {"dataType":"string","required":true},
            "user": {"ref":"AuthUserResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AuthErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LoginRequestBody": {
        "dataType": "refObject",
        "properties": {
            "email": {"dataType":"string"},
            "password": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ValidateResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "user": {"ref":"AuthUserResponse","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ImageUploadResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[true],"required":true},
            "message": {"dataType":"string","required":true},
            "data": {"dataType":"nestedObjectLiteral","nestedProperties":{"contentType":{"dataType":"string","required":true},"filename":{"dataType":"string","required":true}},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "AdminErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"enum","enums":[false],"required":true},
            "error": {"dataType":"string","required":true},
            "details": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LoadImagesResult": {
        "dataType": "refObject",
        "properties": {
            "filename": {"dataType":"string","required":true},
            "productName": {"dataType":"string","required":true},
            "status": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LoadImagesResponse": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "results": {"dataType":"array","array":{"dataType":"refObject","ref":"LoadImagesResult"},"required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CsvImportResponse": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router,opts?:{multer?:ReturnType<typeof multer>}) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################

    const upload = opts?.multer ||  multer({"limits":{"fileSize":8388608}});

    
        const argsUserController_getUsers: Record<string, TsoaRoute.ParameterSchema> = {
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                search: {"in":"query","name":"search","dataType":"string"},
                role: {"in":"query","name":"role","dataType":"string"},
                sortBy: {"in":"query","name":"sortBy","dataType":"union","subSchemas":[{"dataType":"enum","enums":["email"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["lastLogin"]}]},
                sortOrder: {"in":"query","name":"sortOrder","dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}]},
        };
        app.get('/api/users',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.getUsers)),

            async function UserController_getUsers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_getUsers, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'getUsers',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_getBlockedUsers: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/users/blocked',
            authenticateMiddleware([{"bearerAuth":["admin"]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.getBlockedUsers)),

            async function UserController_getBlockedUsers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_getBlockedUsers, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'getBlockedUsers',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_getUserById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/users/:id',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.getUserById)),

            async function UserController_getUserById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_getUserById, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'getUserById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_getUserDetails: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/users/:id/details',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.getUserDetails)),

            async function UserController_getUserDetails(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_getUserDetails, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'getUserDetails',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_createUser: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"CreateUserRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/api/users',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.createUser)),

            async function UserController_createUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_createUser, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'createUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_updateUser: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"UpdateUserRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.put('/api/users/:id',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.updateUser)),

            async function UserController_updateUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_updateUser, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'updateUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_blockUser: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"BlockUserRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/api/users/:id/block',
            authenticateMiddleware([{"bearerAuth":["admin"]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.blockUser)),

            async function UserController_blockUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_blockUser, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'blockUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_unblockUser: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/api/users/:id/unblock',
            authenticateMiddleware([{"bearerAuth":["admin"]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.unblockUser)),

            async function UserController_unblockUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_unblockUser, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'unblockUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_softDeleteUser: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.delete('/api/users/:id/soft',
            authenticateMiddleware([{"bearerAuth":["admin"]}]),
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.softDeleteUser)),

            async function UserController_softDeleteUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_softDeleteUser, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'softDeleteUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsUserController_deleteUser: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/api/users/:id',
            ...(fetchMiddlewares<RequestHandler>(UserController)),
            ...(fetchMiddlewares<RequestHandler>(UserController.prototype.deleteUser)),

            async function UserController_deleteUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsUserController_deleteUser, request, response });

                const controller = new UserController();

              await templateService.apiHandler({
                methodName: 'deleteUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTransactionsController_getTransactions: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                page: {"in":"query","name":"page","dataType":"string"},
                limit: {"in":"query","name":"limit","dataType":"string"},
                type: {"in":"query","name":"type","dataType":"union","subSchemas":[{"dataType":"enum","enums":["buy"]},{"dataType":"enum","enums":["sell"]}]},
                positionId: {"in":"query","name":"positionId","dataType":"string"},
                dateFrom: {"in":"query","name":"dateFrom","dataType":"string"},
                dateTo: {"in":"query","name":"dateTo","dataType":"string"},
                minQuantity: {"in":"query","name":"minQuantity","dataType":"string"},
                maxQuantity: {"in":"query","name":"maxQuantity","dataType":"string"},
                minPrice: {"in":"query","name":"minPrice","dataType":"string"},
                maxPrice: {"in":"query","name":"maxPrice","dataType":"string"},
                sortBy: {"in":"query","name":"sortBy","dataType":"string"},
                sortOrder: {"in":"query","name":"sortOrder","dataType":"string"},
        };
        app.get('/api/transactions',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TransactionsController)),
            ...(fetchMiddlewares<RequestHandler>(TransactionsController.prototype.getTransactions)),

            async function TransactionsController_getTransactions(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTransactionsController_getTransactions, request, response });

                const controller = new TransactionsController();

              await templateService.apiHandler({
                methodName: 'getTransactions',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTransactionsController_createTransaction: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CreateTransactionRequest"},
        };
        app.post('/api/transactions',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TransactionsController)),
            ...(fetchMiddlewares<RequestHandler>(TransactionsController.prototype.createTransaction)),

            async function TransactionsController_createTransaction(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTransactionsController_createTransaction, request, response });

                const controller = new TransactionsController();

              await templateService.apiHandler({
                methodName: 'createTransaction',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsTransactionsController_getTransaction: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/transactions/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(TransactionsController)),
            ...(fetchMiddlewares<RequestHandler>(TransactionsController.prototype.getTransaction)),

            async function TransactionsController_getTransaction(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsTransactionsController_getTransaction, request, response });

                const controller = new TransactionsController();

              await templateService.apiHandler({
                methodName: 'getTransaction',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsRegistrationController_register: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"EnhancedRegistrationRequest"},
                req: {"in":"request","name":"req","required":true,"dataType":"object"},
        };
        app.post('/api/auth/register',
            ...(fetchMiddlewares<RequestHandler>(RegistrationController)),
            ...(fetchMiddlewares<RequestHandler>(RegistrationController.prototype.register)),

            async function RegistrationController_register(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRegistrationController_register, request, response });

                const controller = new RegistrationController();

              await templateService.apiHandler({
                methodName: 'register',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsRegistrationController_checkEmail: Record<string, TsoaRoute.ParameterSchema> = {
                email: {"in":"path","name":"email","required":true,"dataType":"string"},
        };
        app.get('/api/auth/register/check-email/:email',
            ...(fetchMiddlewares<RequestHandler>(RegistrationController)),
            ...(fetchMiddlewares<RequestHandler>(RegistrationController.prototype.checkEmail)),

            async function RegistrationController_checkEmail(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRegistrationController_checkEmail, request, response });

                const controller = new RegistrationController();

              await templateService.apiHandler({
                methodName: 'checkEmail',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsRegistrationController_resendVerification: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"ResendVerificationRequest"},
        };
        app.post('/api/auth/register/resend-verification',
            ...(fetchMiddlewares<RequestHandler>(RegistrationController)),
            ...(fetchMiddlewares<RequestHandler>(RegistrationController.prototype.resendVerification)),

            async function RegistrationController_resendVerification(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsRegistrationController_resendVerification, request, response });

                const controller = new RegistrationController();

              await templateService.apiHandler({
                methodName: 'resendVerification',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsReferenceDataController_getAllReferenceData: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/references',
            ...(fetchMiddlewares<RequestHandler>(ReferenceDataController)),
            ...(fetchMiddlewares<RequestHandler>(ReferenceDataController.prototype.getAllReferenceData)),

            async function ReferenceDataController_getAllReferenceData(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsReferenceDataController_getAllReferenceData, request, response });

                const controller = new ReferenceDataController();

              await templateService.apiHandler({
                methodName: 'getAllReferenceData',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProductTypesController_listProductTypes: Record<string, TsoaRoute.ParameterSchema> = {
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                search: {"in":"query","name":"search","dataType":"string"},
        };
        app.get('/api/productTypes',
            ...(fetchMiddlewares<RequestHandler>(ProductTypesController)),
            ...(fetchMiddlewares<RequestHandler>(ProductTypesController.prototype.listProductTypes)),

            async function ProductTypesController_listProductTypes(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProductTypesController_listProductTypes, request, response });

                const controller = new ProductTypesController();

              await templateService.apiHandler({
                methodName: 'listProductTypes',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProductTypesController_createProductType: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"ProductTypeRequest"},
        };
        app.post('/api/productTypes',
            ...(fetchMiddlewares<RequestHandler>(ProductTypesController)),
            ...(fetchMiddlewares<RequestHandler>(ProductTypesController.prototype.createProductType)),

            async function ProductTypesController_createProductType(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProductTypesController_createProductType, request, response });

                const controller = new ProductTypesController();

              await templateService.apiHandler({
                methodName: 'createProductType',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProductTypesController_updateProductType: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"ProductTypeRequest"},
        };
        app.put('/api/productTypes/:id',
            ...(fetchMiddlewares<RequestHandler>(ProductTypesController)),
            ...(fetchMiddlewares<RequestHandler>(ProductTypesController.prototype.updateProductType)),

            async function ProductTypesController_updateProductType(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProductTypesController_updateProductType, request, response });

                const controller = new ProductTypesController();

              await templateService.apiHandler({
                methodName: 'updateProductType',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProductTypesController_deleteProductType: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/api/productTypes/:id',
            ...(fetchMiddlewares<RequestHandler>(ProductTypesController)),
            ...(fetchMiddlewares<RequestHandler>(ProductTypesController.prototype.deleteProductType)),

            async function ProductTypesController_deleteProductType(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProductTypesController_deleteProductType, request, response });

                const controller = new ProductTypesController();

              await templateService.apiHandler({
                methodName: 'deleteProductType',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 204,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProductTypesController_getProductTypeById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/productTypes/:id',
            ...(fetchMiddlewares<RequestHandler>(ProductTypesController)),
            ...(fetchMiddlewares<RequestHandler>(ProductTypesController.prototype.getProductTypeById)),

            async function ProductTypesController_getProductTypeById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProductTypesController_getProductTypeById, request, response });

                const controller = new ProductTypesController();

              await templateService.apiHandler({
                methodName: 'getProductTypeById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProductController_getProducts: Record<string, TsoaRoute.ParameterSchema> = {
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                sortBy: {"in":"query","name":"sortBy","dataType":"union","subSchemas":[{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["price"]},{"dataType":"enum","enums":["createdAt"]}]},
                sortOrder: {"in":"query","name":"sortOrder","dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}]},
                search: {"in":"query","name":"search","dataType":"string"},
                metalId: {"in":"query","name":"metalId","dataType":"string"},
                productTypeId: {"in":"query","name":"productTypeId","dataType":"string"},
                producerId: {"in":"query","name":"producerId","dataType":"string"},
                inStock: {"in":"query","name":"inStock","dataType":"boolean"},
                minPrice: {"in":"query","name":"minPrice","dataType":"double"},
                maxPrice: {"in":"query","name":"maxPrice","dataType":"double"},
        };
        app.get('/api/products',
            ...(fetchMiddlewares<RequestHandler>(ProductController)),
            ...(fetchMiddlewares<RequestHandler>(ProductController.prototype.getProducts)),

            async function ProductController_getProducts(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProductController_getProducts, request, response });

                const controller = new ProductController();

              await templateService.apiHandler({
                methodName: 'getProducts',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProductController_getProductById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/products/:id',
            ...(fetchMiddlewares<RequestHandler>(ProductController)),
            ...(fetchMiddlewares<RequestHandler>(ProductController.prototype.getProductById)),

            async function ProductController_getProductById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProductController_getProductById, request, response });

                const controller = new ProductController();

              await templateService.apiHandler({
                methodName: 'getProductById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProductController_getProductPrice: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/products/price/:id',
            ...(fetchMiddlewares<RequestHandler>(ProductController)),
            ...(fetchMiddlewares<RequestHandler>(ProductController.prototype.getProductPrice)),

            async function ProductController_getProductPrice(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProductController_getProductPrice, request, response });

                const controller = new ProductController();

              await templateService.apiHandler({
                methodName: 'getProductPrice',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProductController_getProductPrices: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"BulkPriceRequest"},
        };
        app.post('/api/products/prices',
            ...(fetchMiddlewares<RequestHandler>(ProductController)),
            ...(fetchMiddlewares<RequestHandler>(ProductController.prototype.getProductPrices)),

            async function ProductController_getProductPrices(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProductController_getProductPrices, request, response });

                const controller = new ProductController();

              await templateService.apiHandler({
                methodName: 'getProductPrices',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProductController_createProduct: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CreateProductRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/api/products',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ProductController)),
            ...(fetchMiddlewares<RequestHandler>(ProductController.prototype.createProduct)),

            async function ProductController_createProduct(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProductController_createProduct, request, response });

                const controller = new ProductController();

              await templateService.apiHandler({
                methodName: 'createProduct',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProductController_updateProduct: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"UpdateProductRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.put('/api/products/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ProductController)),
            ...(fetchMiddlewares<RequestHandler>(ProductController.prototype.updateProduct)),

            async function ProductController_updateProduct(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProductController_updateProduct, request, response });

                const controller = new ProductController();

              await templateService.apiHandler({
                methodName: 'updateProduct',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProductController_deleteProduct: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.delete('/api/products/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ProductController)),
            ...(fetchMiddlewares<RequestHandler>(ProductController.prototype.deleteProduct)),

            async function ProductController_deleteProduct(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProductController_deleteProduct, request, response });

                const controller = new ProductController();

              await templateService.apiHandler({
                methodName: 'deleteProduct',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProductController_validateProduct: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CreateProductRequest"},
        };
        app.post('/api/products/validate',
            ...(fetchMiddlewares<RequestHandler>(ProductController)),
            ...(fetchMiddlewares<RequestHandler>(ProductController.prototype.validateProduct)),

            async function ProductController_validateProduct(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProductController_validateProduct, request, response });

                const controller = new ProductController();

              await templateService.apiHandler({
                methodName: 'validateProduct',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProductController_getProductImage: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/products/:id/image',
            ...(fetchMiddlewares<RequestHandler>(ProductController)),
            ...(fetchMiddlewares<RequestHandler>(ProductController.prototype.getProductImage)),

            async function ProductController_getProductImage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProductController_getProductImage, request, response });

                const controller = new ProductController();

              await templateService.apiHandler({
                methodName: 'getProductImage',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProductController_uploadProductImage: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"ImageUploadRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/api/products/:id/image',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(ProductController)),
            ...(fetchMiddlewares<RequestHandler>(ProductController.prototype.uploadProductImage)),

            async function ProductController_uploadProductImage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProductController_uploadProductImage, request, response });

                const controller = new ProductController();

              await templateService.apiHandler({
                methodName: 'uploadProductImage',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProducersController_listProducers: Record<string, TsoaRoute.ParameterSchema> = {
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                search: {"in":"query","name":"search","dataType":"string"},
                sortBy: {"in":"query","name":"sortBy","dataType":"union","subSchemas":[{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]},{"dataType":"enum","enums":["status"]}]},
                sortOrder: {"in":"query","name":"sortOrder","dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}]},
        };
        app.get('/api/producers',
            ...(fetchMiddlewares<RequestHandler>(ProducersController)),
            ...(fetchMiddlewares<RequestHandler>(ProducersController.prototype.listProducers)),

            async function ProducersController_listProducers(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProducersController_listProducers, request, response });

                const controller = new ProducersController();

              await templateService.apiHandler({
                methodName: 'listProducers',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProducersController_createProducer: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"infer_typeofProducerCreateRequestSchema_"},
        };
        app.post('/api/producers',
            ...(fetchMiddlewares<RequestHandler>(ProducersController)),
            ...(fetchMiddlewares<RequestHandler>(ProducersController.prototype.createProducer)),

            async function ProducersController_createProducer(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProducersController_createProducer, request, response });

                const controller = new ProducersController();

              await templateService.apiHandler({
                methodName: 'createProducer',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProducersController_getProducerById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/producers/:id',
            ...(fetchMiddlewares<RequestHandler>(ProducersController)),
            ...(fetchMiddlewares<RequestHandler>(ProducersController.prototype.getProducerById)),

            async function ProducersController_getProducerById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProducersController_getProducerById, request, response });

                const controller = new ProducersController();

              await templateService.apiHandler({
                methodName: 'getProducerById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProducersController_updateProducer: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"infer_typeofProducerUpdateRequestSchema_"},
        };
        app.put('/api/producers/:id',
            ...(fetchMiddlewares<RequestHandler>(ProducersController)),
            ...(fetchMiddlewares<RequestHandler>(ProducersController.prototype.updateProducer)),

            async function ProducersController_updateProducer(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProducersController_updateProducer, request, response });

                const controller = new ProducersController();

              await templateService.apiHandler({
                methodName: 'updateProducer',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsProducersController_deleteProducer: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/api/producers/:id',
            ...(fetchMiddlewares<RequestHandler>(ProducersController)),
            ...(fetchMiddlewares<RequestHandler>(ProducersController.prototype.deleteProducer)),

            async function ProducersController_deleteProducer(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsProducersController_deleteProducer, request, response });

                const controller = new ProducersController();

              await templateService.apiHandler({
                methodName: 'deleteProducer',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPositionsController_getPositions: Record<string, TsoaRoute.ParameterSchema> = {
                page: {"default":1,"in":"query","name":"page","dataType":"double"},
                limit: {"default":20,"in":"query","name":"limit","dataType":"double"},
                status: {"default":"active","in":"query","name":"status","dataType":"string"},
        };
        app.get('/api/positions',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PositionsController)),
            ...(fetchMiddlewares<RequestHandler>(PositionsController.prototype.getPositions)),

            async function PositionsController_getPositions(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPositionsController_getPositions, request, response });

                const controller = new PositionsController();

              await templateService.apiHandler({
                methodName: 'getPositions',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPositionsController_getPortfolioPositions: Record<string, TsoaRoute.ParameterSchema> = {
                portfolioId: {"in":"path","name":"portfolioId","required":true,"dataType":"string"},
        };
        app.get('/api/positions/portfolios/:portfolioId/positions',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PositionsController)),
            ...(fetchMiddlewares<RequestHandler>(PositionsController.prototype.getPortfolioPositions)),

            async function PositionsController_getPortfolioPositions(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPositionsController_getPortfolioPositions, request, response });

                const controller = new PositionsController();

              await templateService.apiHandler({
                methodName: 'getPortfolioPositions',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPositionsController_getPosition: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/positions/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PositionsController)),
            ...(fetchMiddlewares<RequestHandler>(PositionsController.prototype.getPosition)),

            async function PositionsController_getPosition(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPositionsController_getPosition, request, response });

                const controller = new PositionsController();

              await templateService.apiHandler({
                methodName: 'getPosition',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPortfolioController_getPortfolios: Record<string, TsoaRoute.ParameterSchema> = {
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                search: {"in":"query","name":"search","dataType":"string"},
                ownerId: {"in":"query","name":"ownerId","dataType":"string"},
                isActive: {"in":"query","name":"isActive","dataType":"boolean"},
                minValue: {"in":"query","name":"minValue","dataType":"double"},
                maxValue: {"in":"query","name":"maxValue","dataType":"double"},
                minPositionCount: {"in":"query","name":"minPositionCount","dataType":"double"},
                maxPositionCount: {"in":"query","name":"maxPositionCount","dataType":"double"},
                minGainLoss: {"in":"query","name":"minGainLoss","dataType":"double"},
                maxGainLoss: {"in":"query","name":"maxGainLoss","dataType":"double"},
                createdAfter: {"in":"query","name":"createdAfter","dataType":"string"},
                createdBefore: {"in":"query","name":"createdBefore","dataType":"string"},
                updatedAfter: {"in":"query","name":"updatedAfter","dataType":"string"},
                updatedBefore: {"in":"query","name":"updatedBefore","dataType":"string"},
                metal: {"in":"query","name":"metal","dataType":"union","subSchemas":[{"dataType":"enum","enums":["gold"]},{"dataType":"enum","enums":["silver"]},{"dataType":"enum","enums":["platinum"]},{"dataType":"enum","enums":["palladium"]}]},
                sortBy: {"in":"query","name":"sortBy","dataType":"union","subSchemas":[{"dataType":"enum","enums":["portfolioName"]},{"dataType":"enum","enums":["totalValue"]},{"dataType":"enum","enums":["totalGainLoss"]},{"dataType":"enum","enums":["positionCount"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["updatedAt"]}]},
                sortOrder: {"in":"query","name":"sortOrder","dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}]},
        };
        app.get('/api/portfolios',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PortfolioController)),
            ...(fetchMiddlewares<RequestHandler>(PortfolioController.prototype.getPortfolios)),

            async function PortfolioController_getPortfolios(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPortfolioController_getPortfolios, request, response });

                const controller = new PortfolioController();

              await templateService.apiHandler({
                methodName: 'getPortfolios',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPortfolioController_getMyPortfolios: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/portfolios/my',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PortfolioController)),
            ...(fetchMiddlewares<RequestHandler>(PortfolioController.prototype.getMyPortfolios)),

            async function PortfolioController_getMyPortfolios(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPortfolioController_getMyPortfolios, request, response });

                const controller = new PortfolioController();

              await templateService.apiHandler({
                methodName: 'getMyPortfolios',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPortfolioController_getPortfolioById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/portfolios/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PortfolioController)),
            ...(fetchMiddlewares<RequestHandler>(PortfolioController.prototype.getPortfolioById)),

            async function PortfolioController_getPortfolioById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPortfolioController_getPortfolioById, request, response });

                const controller = new PortfolioController();

              await templateService.apiHandler({
                methodName: 'getPortfolioById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPortfolioController_getPortfolioSummary: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/portfolios/:id/summary',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PortfolioController)),
            ...(fetchMiddlewares<RequestHandler>(PortfolioController.prototype.getPortfolioSummary)),

            async function PortfolioController_getPortfolioSummary(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPortfolioController_getPortfolioSummary, request, response });

                const controller = new PortfolioController();

              await templateService.apiHandler({
                methodName: 'getPortfolioSummary',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPortfolioController_createPortfolio: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CreatePortfolioRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/api/portfolios',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PortfolioController)),
            ...(fetchMiddlewares<RequestHandler>(PortfolioController.prototype.createPortfolio)),

            async function PortfolioController_createPortfolio(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPortfolioController_createPortfolio, request, response });

                const controller = new PortfolioController();

              await templateService.apiHandler({
                methodName: 'createPortfolio',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPortfolioController_updatePortfolio: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"UpdatePortfolioRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.put('/api/portfolios/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PortfolioController)),
            ...(fetchMiddlewares<RequestHandler>(PortfolioController.prototype.updatePortfolio)),

            async function PortfolioController_updatePortfolio(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPortfolioController_updatePortfolio, request, response });

                const controller = new PortfolioController();

              await templateService.apiHandler({
                methodName: 'updatePortfolio',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPortfolioController_deletePortfolio: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.delete('/api/portfolios/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PortfolioController)),
            ...(fetchMiddlewares<RequestHandler>(PortfolioController.prototype.deletePortfolio)),

            async function PortfolioController_deletePortfolio(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPortfolioController_deletePortfolio, request, response });

                const controller = new PortfolioController();

              await templateService.apiHandler({
                methodName: 'deletePortfolio',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPaymentsController_createPaymentIntent: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CreatePaymentIntentRequest"},
        };
        app.post('/api/payments/intent',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PaymentsController)),
            ...(fetchMiddlewares<RequestHandler>(PaymentsController.prototype.createPaymentIntent)),

            async function PaymentsController_createPaymentIntent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPaymentsController_createPaymentIntent, request, response });

                const controller = new PaymentsController();

              await templateService.apiHandler({
                methodName: 'createPaymentIntent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPaymentsController_confirmPayment: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"Partial_ConfirmPaymentRequest_"},
        };
        app.post('/api/payments/intent/:id/confirm',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PaymentsController)),
            ...(fetchMiddlewares<RequestHandler>(PaymentsController.prototype.confirmPayment)),

            async function PaymentsController_confirmPayment(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPaymentsController_confirmPayment, request, response });

                const controller = new PaymentsController();

              await templateService.apiHandler({
                methodName: 'confirmPayment',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPaymentsController_retrievePaymentIntent: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/payments/intent/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PaymentsController)),
            ...(fetchMiddlewares<RequestHandler>(PaymentsController.prototype.retrievePaymentIntent)),

            async function PaymentsController_retrievePaymentIntent(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPaymentsController_retrievePaymentIntent, request, response });

                const controller = new PaymentsController();

              await templateService.apiHandler({
                methodName: 'retrievePaymentIntent',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsPaymentsController_listPaymentMethods: Record<string, TsoaRoute.ParameterSchema> = {
                customerId: {"in":"query","name":"customerId","required":true,"dataType":"string"},
        };
        app.get('/api/payments/methods',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(PaymentsController)),
            ...(fetchMiddlewares<RequestHandler>(PaymentsController.prototype.listPaymentMethods)),

            async function PaymentsController_listPaymentMethods(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsPaymentsController_listPaymentMethods, request, response });

                const controller = new PaymentsController();

              await templateService.apiHandler({
                methodName: 'listPaymentMethods',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOrdersController_getOrders: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                status: {"in":"query","name":"status","dataType":"string"},
                type: {"in":"query","name":"type","dataType":"string"},
                userId: {"in":"query","name":"userId","dataType":"string"},
        };
        app.get('/api/orders',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrdersController)),
            ...(fetchMiddlewares<RequestHandler>(OrdersController.prototype.getOrders)),

            async function OrdersController_getOrders(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrdersController_getOrders, request, response });

                const controller = new OrdersController();

              await templateService.apiHandler({
                methodName: 'getOrders',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOrdersController_getOrdersAdmin: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                status: {"in":"query","name":"status","dataType":"string"},
                type: {"in":"query","name":"type","dataType":"string"},
                userId: {"in":"query","name":"userId","dataType":"string"},
        };
        app.get('/api/orders/admin',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrdersController)),
            ...(fetchMiddlewares<RequestHandler>(OrdersController.prototype.getOrdersAdmin)),

            async function OrdersController_getOrdersAdmin(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrdersController_getOrdersAdmin, request, response });

                const controller = new OrdersController();

              await templateService.apiHandler({
                methodName: 'getOrdersAdmin',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOrdersController_getMyOrders: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                status: {"in":"query","name":"status","dataType":"string"},
                type: {"in":"query","name":"type","dataType":"string"},
        };
        app.get('/api/orders/my',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrdersController)),
            ...(fetchMiddlewares<RequestHandler>(OrdersController.prototype.getMyOrders)),

            async function OrdersController_getMyOrders(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrdersController_getMyOrders, request, response });

                const controller = new OrdersController();

              await templateService.apiHandler({
                methodName: 'getMyOrders',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOrdersController_createOrder: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                body: {"in":"body","name":"body","required":true,"ref":"OrdersCreateInput"},
        };
        app.post('/api/orders',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrdersController)),
            ...(fetchMiddlewares<RequestHandler>(OrdersController.prototype.createOrder)),

            async function OrdersController_createOrder(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrdersController_createOrder, request, response });

                const controller = new OrdersController();

              await templateService.apiHandler({
                methodName: 'createOrder',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOrdersController_getOrder: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/orders/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrdersController)),
            ...(fetchMiddlewares<RequestHandler>(OrdersController.prototype.getOrder)),

            async function OrdersController_getOrder(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrdersController_getOrder, request, response });

                const controller = new OrdersController();

              await templateService.apiHandler({
                methodName: 'getOrder',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOrdersController_getOrderDetailed: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/orders/:id/detailed',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrdersController)),
            ...(fetchMiddlewares<RequestHandler>(OrdersController.prototype.getOrderDetailed)),

            async function OrdersController_getOrderDetailed(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrdersController_getOrderDetailed, request, response });

                const controller = new OrdersController();

              await templateService.apiHandler({
                methodName: 'getOrderDetailed',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOrdersController_processOrder: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.post('/api/orders/:id/process',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrdersController)),
            ...(fetchMiddlewares<RequestHandler>(OrdersController.prototype.processOrder)),

            async function OrdersController_processOrder(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrdersController_processOrder, request, response });

                const controller = new OrdersController();

              await templateService.apiHandler({
                methodName: 'processOrder',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOrdersController_updateOrder: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                body: {"in":"body","name":"body","required":true,"ref":"OrdersUpdateInput"},
        };
        app.put('/api/orders/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrdersController)),
            ...(fetchMiddlewares<RequestHandler>(OrdersController.prototype.updateOrder)),

            async function OrdersController_updateOrder(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrdersController_updateOrder, request, response });

                const controller = new OrdersController();

              await templateService.apiHandler({
                methodName: 'updateOrder',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOrdersController_deleteOrder: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/api/orders/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrdersController)),
            ...(fetchMiddlewares<RequestHandler>(OrdersController.prototype.deleteOrder)),

            async function OrdersController_deleteOrder(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrdersController_deleteOrder, request, response });

                const controller = new OrdersController();

              await templateService.apiHandler({
                methodName: 'deleteOrder',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOrdersController_cancelOrder: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.post('/api/orders/:id/cancel',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(OrdersController)),
            ...(fetchMiddlewares<RequestHandler>(OrdersController.prototype.cancelOrder)),

            async function OrdersController_cancelOrder(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrdersController_cancelOrder, request, response });

                const controller = new OrdersController();

              await templateService.apiHandler({
                methodName: 'cancelOrder',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsOrderStatusController_listOrderStatus: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/orderstatus',
            ...(fetchMiddlewares<RequestHandler>(OrderStatusController)),
            ...(fetchMiddlewares<RequestHandler>(OrderStatusController.prototype.listOrderStatus)),

            async function OrderStatusController_listOrderStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsOrderStatusController_listOrderStatus, request, response });

                const controller = new OrderStatusController();

              await templateService.apiHandler({
                methodName: 'listOrderStatus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMetalsController_listMetals: Record<string, TsoaRoute.ParameterSchema> = {
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                search: {"in":"query","name":"search","dataType":"string"},
        };
        app.get('/api/metals',
            ...(fetchMiddlewares<RequestHandler>(MetalsController)),
            ...(fetchMiddlewares<RequestHandler>(MetalsController.prototype.listMetals)),

            async function MetalsController_listMetals(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMetalsController_listMetals, request, response });

                const controller = new MetalsController();

              await templateService.apiHandler({
                methodName: 'listMetals',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMetalsController_createMetal: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"MetalRequest"},
        };
        app.post('/api/metals',
            ...(fetchMiddlewares<RequestHandler>(MetalsController)),
            ...(fetchMiddlewares<RequestHandler>(MetalsController.prototype.createMetal)),

            async function MetalsController_createMetal(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMetalsController_createMetal, request, response });

                const controller = new MetalsController();

              await templateService.apiHandler({
                methodName: 'createMetal',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMetalsController_updateMetal: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"MetalRequest"},
        };
        app.put('/api/metals/:id',
            ...(fetchMiddlewares<RequestHandler>(MetalsController)),
            ...(fetchMiddlewares<RequestHandler>(MetalsController.prototype.updateMetal)),

            async function MetalsController_updateMetal(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMetalsController_updateMetal, request, response });

                const controller = new MetalsController();

              await templateService.apiHandler({
                methodName: 'updateMetal',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMetalsController_deleteMetal: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/api/metals/:id',
            ...(fetchMiddlewares<RequestHandler>(MetalsController)),
            ...(fetchMiddlewares<RequestHandler>(MetalsController.prototype.deleteMetal)),

            async function MetalsController_deleteMetal(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMetalsController_deleteMetal, request, response });

                const controller = new MetalsController();

              await templateService.apiHandler({
                methodName: 'deleteMetal',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 204,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMetalsController_getMetalById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/metals/:id',
            ...(fetchMiddlewares<RequestHandler>(MetalsController)),
            ...(fetchMiddlewares<RequestHandler>(MetalsController.prototype.getMetalById)),

            async function MetalsController_getMetalById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMetalsController_getMetalById, request, response });

                const controller = new MetalsController();

              await templateService.apiHandler({
                methodName: 'getMetalById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMarketDataController_getCurrentPrice: Record<string, TsoaRoute.ParameterSchema> = {
                metalSymbol: {"in":"path","name":"metalSymbol","required":true,"dataType":"string"},
                currency: {"in":"query","name":"currency","dataType":"string"},
        };
        app.get('/api/market-data/price/:metalSymbol',
            ...(fetchMiddlewares<RequestHandler>(MarketDataController)),
            ...(fetchMiddlewares<RequestHandler>(MarketDataController.prototype.getCurrentPrice)),

            async function MarketDataController_getCurrentPrice(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMarketDataController_getCurrentPrice, request, response });

                const controller = new MarketDataController();

              await templateService.apiHandler({
                methodName: 'getCurrentPrice',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMarketDataController_getMultiplePrices: Record<string, TsoaRoute.ParameterSchema> = {
                symbols: {"in":"query","name":"symbols","dataType":"string"},
                currency: {"in":"query","name":"currency","dataType":"string"},
        };
        app.get('/api/market-data/prices',
            ...(fetchMiddlewares<RequestHandler>(MarketDataController)),
            ...(fetchMiddlewares<RequestHandler>(MarketDataController.prototype.getMultiplePrices)),

            async function MarketDataController_getMultiplePrices(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMarketDataController_getMultiplePrices, request, response });

                const controller = new MarketDataController();

              await templateService.apiHandler({
                methodName: 'getMultiplePrices',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMarketDataController_getHistoricalPrices: Record<string, TsoaRoute.ParameterSchema> = {
                metalSymbol: {"in":"path","name":"metalSymbol","required":true,"dataType":"string"},
                startDate: {"in":"query","name":"startDate","dataType":"string"},
                endDate: {"in":"query","name":"endDate","dataType":"string"},
                currency: {"in":"query","name":"currency","dataType":"string"},
                limit: {"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/api/market-data/history/:metalSymbol',
            ...(fetchMiddlewares<RequestHandler>(MarketDataController)),
            ...(fetchMiddlewares<RequestHandler>(MarketDataController.prototype.getHistoricalPrices)),

            async function MarketDataController_getHistoricalPrices(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMarketDataController_getHistoricalPrices, request, response });

                const controller = new MarketDataController();

              await templateService.apiHandler({
                methodName: 'getHistoricalPrices',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMarketDataController_triggerPriceUpdate: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/api/market-data/update',
            authenticateMiddleware([{"bearerAuth":["admin"]}]),
            ...(fetchMiddlewares<RequestHandler>(MarketDataController)),
            ...(fetchMiddlewares<RequestHandler>(MarketDataController.prototype.triggerPriceUpdate)),

            async function MarketDataController_triggerPriceUpdate(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMarketDataController_triggerPriceUpdate, request, response });

                const controller = new MarketDataController();

              await templateService.apiHandler({
                methodName: 'triggerPriceUpdate',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMarketDataController_getProviderStatus: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/market-data/providers',
            ...(fetchMiddlewares<RequestHandler>(MarketDataController)),
            ...(fetchMiddlewares<RequestHandler>(MarketDataController.prototype.getProviderStatus)),

            async function MarketDataController_getProviderStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMarketDataController_getProviderStatus, request, response });

                const controller = new MarketDataController();

              await templateService.apiHandler({
                methodName: 'getProviderStatus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsMarketDataController_cleanupCache: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.delete('/api/market-data/cache',
            authenticateMiddleware([{"bearerAuth":["admin"]}]),
            ...(fetchMiddlewares<RequestHandler>(MarketDataController)),
            ...(fetchMiddlewares<RequestHandler>(MarketDataController.prototype.cleanupCache)),

            async function MarketDataController_cleanupCache(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsMarketDataController_cleanupCache, request, response });

                const controller = new MarketDataController();

              await templateService.apiHandler({
                methodName: 'cleanupCache',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLbmaController_getPriceTypes: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/lbma/price-types',
            ...(fetchMiddlewares<RequestHandler>(LbmaController)),
            ...(fetchMiddlewares<RequestHandler>(LbmaController.prototype.getPriceTypes)),

            async function LbmaController_getPriceTypes(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLbmaController_getPriceTypes, request, response });

                const controller = new LbmaController();

              await templateService.apiHandler({
                methodName: 'getPriceTypes',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLbmaController_getBenchmarkPriceTypes: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/lbma/price-types/benchmark',
            ...(fetchMiddlewares<RequestHandler>(LbmaController)),
            ...(fetchMiddlewares<RequestHandler>(LbmaController.prototype.getBenchmarkPriceTypes)),

            async function LbmaController_getBenchmarkPriceTypes(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLbmaController_getBenchmarkPriceTypes, request, response });

                const controller = new LbmaController();

              await templateService.apiHandler({
                methodName: 'getBenchmarkPriceTypes',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLbmaController_getLatestPrice: Record<string, TsoaRoute.ParameterSchema> = {
                metalSymbol: {"in":"path","name":"metalSymbol","required":true,"dataType":"string"},
                type: {"in":"query","name":"type","dataType":"string"},
        };
        app.get('/api/lbma/price/:metalSymbol',
            ...(fetchMiddlewares<RequestHandler>(LbmaController)),
            ...(fetchMiddlewares<RequestHandler>(LbmaController.prototype.getLatestPrice)),

            async function LbmaController_getLatestPrice(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLbmaController_getLatestPrice, request, response });

                const controller = new LbmaController();

              await templateService.apiHandler({
                methodName: 'getLatestPrice',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLbmaController_getPriceByDate: Record<string, TsoaRoute.ParameterSchema> = {
                metalSymbol: {"in":"path","name":"metalSymbol","required":true,"dataType":"string"},
                date: {"in":"path","name":"date","required":true,"dataType":"string"},
                type: {"in":"query","name":"type","dataType":"string"},
        };
        app.get('/api/lbma/price/:metalSymbol/:date',
            ...(fetchMiddlewares<RequestHandler>(LbmaController)),
            ...(fetchMiddlewares<RequestHandler>(LbmaController.prototype.getPriceByDate)),

            async function LbmaController_getPriceByDate(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLbmaController_getPriceByDate, request, response });

                const controller = new LbmaController();

              await templateService.apiHandler({
                methodName: 'getPriceByDate',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLbmaController_getHistory: Record<string, TsoaRoute.ParameterSchema> = {
                metalSymbol: {"in":"path","name":"metalSymbol","required":true,"dataType":"string"},
                startDate: {"in":"query","name":"startDate","dataType":"string"},
                endDate: {"in":"query","name":"endDate","dataType":"string"},
                type: {"in":"query","name":"type","dataType":"string"},
                limit: {"in":"query","name":"limit","dataType":"double"},
        };
        app.get('/api/lbma/history/:metalSymbol',
            ...(fetchMiddlewares<RequestHandler>(LbmaController)),
            ...(fetchMiddlewares<RequestHandler>(LbmaController.prototype.getHistory)),

            async function LbmaController_getHistory(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLbmaController_getHistory, request, response });

                const controller = new LbmaController();

              await templateService.apiHandler({
                methodName: 'getHistory',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLbmaController_getTodayFixings: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/lbma/fixings/today',
            ...(fetchMiddlewares<RequestHandler>(LbmaController)),
            ...(fetchMiddlewares<RequestHandler>(LbmaController.prototype.getTodayFixings)),

            async function LbmaController_getTodayFixings(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLbmaController_getTodayFixings, request, response });

                const controller = new LbmaController();

              await templateService.apiHandler({
                methodName: 'getTodayFixings',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLbmaController_fetchPrices: Record<string, TsoaRoute.ParameterSchema> = {
                metalSymbol: {"in":"path","name":"metalSymbol","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","ref":"FetchPricesRequest"},
        };
        app.post('/api/lbma/fetch/:metalSymbol',
            authenticateMiddleware([{"bearerAuth":["admin"]}]),
            ...(fetchMiddlewares<RequestHandler>(LbmaController)),
            ...(fetchMiddlewares<RequestHandler>(LbmaController.prototype.fetchPrices)),

            async function LbmaController_fetchPrices(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLbmaController_fetchPrices, request, response });

                const controller = new LbmaController();

              await templateService.apiHandler({
                methodName: 'fetchPrices',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLbmaController_fetchHistoricalPrices: Record<string, TsoaRoute.ParameterSchema> = {
                metalSymbol: {"in":"path","name":"metalSymbol","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"FetchHistoricalRequest"},
        };
        app.post('/api/lbma/fetch-historical/:metalSymbol',
            authenticateMiddleware([{"bearerAuth":["admin"]}]),
            ...(fetchMiddlewares<RequestHandler>(LbmaController)),
            ...(fetchMiddlewares<RequestHandler>(LbmaController.prototype.fetchHistoricalPrices)),

            async function LbmaController_fetchHistoricalPrices(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLbmaController_fetchHistoricalPrices, request, response });

                const controller = new LbmaController();

              await templateService.apiHandler({
                methodName: 'fetchHistoricalPrices',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLbmaController_calculatePremium: Record<string, TsoaRoute.ParameterSchema> = {
                metalSymbol: {"in":"path","name":"metalSymbol","required":true,"dataType":"string"},
                quantity: {"in":"query","name":"quantity","dataType":"double"},
                currency: {"in":"query","name":"currency","dataType":"string"},
                baseType: {"in":"query","name":"baseType","dataType":"string"},
        };
        app.get('/api/lbma/premium/calculate/:metalSymbol',
            ...(fetchMiddlewares<RequestHandler>(LbmaController)),
            ...(fetchMiddlewares<RequestHandler>(LbmaController.prototype.calculatePremium)),

            async function LbmaController_calculatePremium(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLbmaController_calculatePremium, request, response });

                const controller = new LbmaController();

              await templateService.apiHandler({
                methodName: 'calculatePremium',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLbmaController_getPremiumConfigs: Record<string, TsoaRoute.ParameterSchema> = {
                metal: {"in":"query","name":"metal","dataType":"string"},
        };
        app.get('/api/lbma/premium/configs',
            ...(fetchMiddlewares<RequestHandler>(LbmaController)),
            ...(fetchMiddlewares<RequestHandler>(LbmaController.prototype.getPremiumConfigs)),

            async function LbmaController_getPremiumConfigs(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLbmaController_getPremiumConfigs, request, response });

                const controller = new LbmaController();

              await templateService.apiHandler({
                methodName: 'getPremiumConfigs',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLbmaController_createPremiumConfig: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CreatePremiumConfigRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/api/lbma/premium/configs',
            authenticateMiddleware([{"bearerAuth":["admin"]}]),
            ...(fetchMiddlewares<RequestHandler>(LbmaController)),
            ...(fetchMiddlewares<RequestHandler>(LbmaController.prototype.createPremiumConfig)),

            async function LbmaController_createPremiumConfig(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLbmaController_createPremiumConfig, request, response });

                const controller = new LbmaController();

              await templateService.apiHandler({
                methodName: 'createPremiumConfig',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLbmaController_updatePremiumConfig: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"UpdatePremiumConfigRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.patch('/api/lbma/premium/configs/:id',
            authenticateMiddleware([{"bearerAuth":["admin"]}]),
            ...(fetchMiddlewares<RequestHandler>(LbmaController)),
            ...(fetchMiddlewares<RequestHandler>(LbmaController.prototype.updatePremiumConfig)),

            async function LbmaController_updatePremiumConfig(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLbmaController_updatePremiumConfig, request, response });

                const controller = new LbmaController();

              await templateService.apiHandler({
                methodName: 'updatePremiumConfig',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsLbmaController_comparePrices: Record<string, TsoaRoute.ParameterSchema> = {
                metalSymbol: {"in":"path","name":"metalSymbol","required":true,"dataType":"string"},
                currency: {"in":"query","name":"currency","dataType":"string"},
        };
        app.get('/api/lbma/compare/:metalSymbol',
            ...(fetchMiddlewares<RequestHandler>(LbmaController)),
            ...(fetchMiddlewares<RequestHandler>(LbmaController.prototype.comparePrices)),

            async function LbmaController_comparePrices(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsLbmaController_comparePrices, request, response });

                const controller = new LbmaController();

              await templateService.apiHandler({
                methodName: 'comparePrices',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustodyServiceController_getAllCustodyServices: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/custody',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CustodyServiceController)),
            ...(fetchMiddlewares<RequestHandler>(CustodyServiceController.prototype.getAllCustodyServices)),

            async function CustodyServiceController_getAllCustodyServices(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustodyServiceController_getAllCustodyServices, request, response });

                const controller = new CustodyServiceController();

              await templateService.apiHandler({
                methodName: 'getAllCustodyServices',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustodyServiceController_getCustodyServicesPaginated: Record<string, TsoaRoute.ParameterSchema> = {
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                search: {"in":"query","name":"search","dataType":"string"},
                custodianId: {"in":"query","name":"custodianId","dataType":"string"},
                paymentFrequency: {"in":"query","name":"paymentFrequency","ref":"PaymentFrequency"},
                sortBy: {"in":"query","name":"sortBy","dataType":"string"},
                sortOrder: {"in":"query","name":"sortOrder","dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}]},
        };
        app.get('/api/custody/custodyServices',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CustodyServiceController)),
            ...(fetchMiddlewares<RequestHandler>(CustodyServiceController.prototype.getCustodyServicesPaginated)),

            async function CustodyServiceController_getCustodyServicesPaginated(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustodyServiceController_getCustodyServicesPaginated, request, response });

                const controller = new CustodyServiceController();

              await templateService.apiHandler({
                methodName: 'getCustodyServicesPaginated',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustodyServiceController_getDefaultCustodyService: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/custody/custodyServices/default',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CustodyServiceController)),
            ...(fetchMiddlewares<RequestHandler>(CustodyServiceController.prototype.getDefaultCustodyService)),

            async function CustodyServiceController_getDefaultCustodyService(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustodyServiceController_getDefaultCustodyService, request, response });

                const controller = new CustodyServiceController();

              await templateService.apiHandler({
                methodName: 'getDefaultCustodyService',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustodyServiceController_getCustodyServiceById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/custody/custodyServices/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CustodyServiceController)),
            ...(fetchMiddlewares<RequestHandler>(CustodyServiceController.prototype.getCustodyServiceById)),

            async function CustodyServiceController_getCustodyServiceById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustodyServiceController_getCustodyServiceById, request, response });

                const controller = new CustodyServiceController();

              await templateService.apiHandler({
                methodName: 'getCustodyServiceById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustodyServiceController_createCustodyService: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CustodyServiceCreateRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/api/custody',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CustodyServiceController)),
            ...(fetchMiddlewares<RequestHandler>(CustodyServiceController.prototype.createCustodyService)),

            async function CustodyServiceController_createCustodyService(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustodyServiceController_createCustodyService, request, response });

                const controller = new CustodyServiceController();

              await templateService.apiHandler({
                methodName: 'createCustodyService',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustodyServiceController_updateCustodyService: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CustodyServiceUpdateRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.put('/api/custody/custodyServices/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CustodyServiceController)),
            ...(fetchMiddlewares<RequestHandler>(CustodyServiceController.prototype.updateCustodyService)),

            async function CustodyServiceController_updateCustodyService(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustodyServiceController_updateCustodyService, request, response });

                const controller = new CustodyServiceController();

              await templateService.apiHandler({
                methodName: 'updateCustodyService',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustodyServiceController_deleteCustodyService: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.delete('/api/custody/custodyServices/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CustodyServiceController)),
            ...(fetchMiddlewares<RequestHandler>(CustodyServiceController.prototype.deleteCustodyService)),

            async function CustodyServiceController_deleteCustodyService(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustodyServiceController_deleteCustodyService, request, response });

                const controller = new CustodyServiceController();

              await templateService.apiHandler({
                methodName: 'deleteCustodyService',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustodyServiceController_getCustodiansWithServices: Record<string, TsoaRoute.ParameterSchema> = {
                search: {"in":"query","name":"search","dataType":"string"},
        };
        app.get('/api/custody/custodians-with-services',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CustodyServiceController)),
            ...(fetchMiddlewares<RequestHandler>(CustodyServiceController.prototype.getCustodiansWithServices)),

            async function CustodyServiceController_getCustodiansWithServices(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustodyServiceController_getCustodiansWithServices, request, response });

                const controller = new CustodyServiceController();

              await templateService.apiHandler({
                methodName: 'getCustodiansWithServices',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustodiansController_getAllCustodians: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/custodians',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CustodiansController)),
            ...(fetchMiddlewares<RequestHandler>(CustodiansController.prototype.getAllCustodians)),

            async function CustodiansController_getAllCustodians(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustodiansController_getAllCustodians, request, response });

                const controller = new CustodiansController();

              await templateService.apiHandler({
                methodName: 'getAllCustodians',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustodiansController_getCustodiansPaginated: Record<string, TsoaRoute.ParameterSchema> = {
                page: {"in":"query","name":"page","dataType":"double"},
                limit: {"in":"query","name":"limit","dataType":"double"},
                search: {"in":"query","name":"search","dataType":"string"},
                sortBy: {"in":"query","name":"sortBy","dataType":"union","subSchemas":[{"dataType":"enum","enums":["custodianName"]},{"dataType":"enum","enums":["createdAt"]},{"dataType":"enum","enums":["name"]},{"dataType":"enum","enums":["updatedAt"]}]},
                sortOrder: {"in":"query","name":"sortOrder","dataType":"union","subSchemas":[{"dataType":"enum","enums":["asc"]},{"dataType":"enum","enums":["desc"]}]},
                isActive: {"in":"query","name":"isActive","dataType":"boolean"},
                region: {"in":"query","name":"region","dataType":"string"},
        };
        app.get('/api/custodians/custodians',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CustodiansController)),
            ...(fetchMiddlewares<RequestHandler>(CustodiansController.prototype.getCustodiansPaginated)),

            async function CustodiansController_getCustodiansPaginated(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustodiansController_getCustodiansPaginated, request, response });

                const controller = new CustodiansController();

              await templateService.apiHandler({
                methodName: 'getCustodiansPaginated',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustodiansController_createCustodian: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CustodianCreateRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.post('/api/custodians',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CustodiansController)),
            ...(fetchMiddlewares<RequestHandler>(CustodiansController.prototype.createCustodian)),

            async function CustodiansController_createCustodian(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustodiansController_createCustodian, request, response });

                const controller = new CustodiansController();

              await templateService.apiHandler({
                methodName: 'createCustodian',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustodiansController_getCustodianById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/custodians/custodians/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CustodiansController)),
            ...(fetchMiddlewares<RequestHandler>(CustodiansController.prototype.getCustodianById)),

            async function CustodiansController_getCustodianById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustodiansController_getCustodianById, request, response });

                const controller = new CustodiansController();

              await templateService.apiHandler({
                methodName: 'getCustodianById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustodiansController_updateCustodian: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CustodianUpdateRequest"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.put('/api/custodians/custodians/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CustodiansController)),
            ...(fetchMiddlewares<RequestHandler>(CustodiansController.prototype.updateCustodian)),

            async function CustodiansController_updateCustodian(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustodiansController_updateCustodian, request, response });

                const controller = new CustodiansController();

              await templateService.apiHandler({
                methodName: 'updateCustodian',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCustodiansController_deleteCustodian: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.delete('/api/custodians/custodians/:id',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(CustodiansController)),
            ...(fetchMiddlewares<RequestHandler>(CustodiansController.prototype.deleteCustodian)),

            async function CustodiansController_deleteCustodian(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCustodiansController_deleteCustodian, request, response });

                const controller = new CustodiansController();

              await templateService.apiHandler({
                methodName: 'deleteCustodian',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCurrenciesController_listCurrencies: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/currencies',
            ...(fetchMiddlewares<RequestHandler>(CurrenciesController)),
            ...(fetchMiddlewares<RequestHandler>(CurrenciesController.prototype.listCurrencies)),

            async function CurrenciesController_listCurrencies(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCurrenciesController_listCurrencies, request, response });

                const controller = new CurrenciesController();

              await templateService.apiHandler({
                methodName: 'listCurrencies',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCurrenciesController_createCurrency: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CurrencyRequest"},
        };
        app.post('/api/currencies',
            ...(fetchMiddlewares<RequestHandler>(CurrenciesController)),
            ...(fetchMiddlewares<RequestHandler>(CurrenciesController.prototype.createCurrency)),

            async function CurrenciesController_createCurrency(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCurrenciesController_createCurrency, request, response });

                const controller = new CurrenciesController();

              await templateService.apiHandler({
                methodName: 'createCurrency',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCurrenciesController_updateCurrency: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CurrencyRequest"},
        };
        app.put('/api/currencies/:id',
            ...(fetchMiddlewares<RequestHandler>(CurrenciesController)),
            ...(fetchMiddlewares<RequestHandler>(CurrenciesController.prototype.updateCurrency)),

            async function CurrenciesController_updateCurrency(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCurrenciesController_updateCurrency, request, response });

                const controller = new CurrenciesController();

              await templateService.apiHandler({
                methodName: 'updateCurrency',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCurrenciesController_deleteCurrency: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/api/currencies/:id',
            ...(fetchMiddlewares<RequestHandler>(CurrenciesController)),
            ...(fetchMiddlewares<RequestHandler>(CurrenciesController.prototype.deleteCurrency)),

            async function CurrenciesController_deleteCurrency(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCurrenciesController_deleteCurrency, request, response });

                const controller = new CurrenciesController();

              await templateService.apiHandler({
                methodName: 'deleteCurrency',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 204,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCurrenciesController_getCurrencyById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/currencies/:id',
            ...(fetchMiddlewares<RequestHandler>(CurrenciesController)),
            ...(fetchMiddlewares<RequestHandler>(CurrenciesController.prototype.getCurrencyById)),

            async function CurrenciesController_getCurrencyById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCurrenciesController_getCurrencyById, request, response });

                const controller = new CurrenciesController();

              await templateService.apiHandler({
                methodName: 'getCurrencyById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCountriesController_listCountries: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/countries',
            ...(fetchMiddlewares<RequestHandler>(CountriesController)),
            ...(fetchMiddlewares<RequestHandler>(CountriesController.prototype.listCountries)),

            async function CountriesController_listCountries(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCountriesController_listCountries, request, response });

                const controller = new CountriesController();

              await templateService.apiHandler({
                methodName: 'listCountries',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCountriesController_createCountry: Record<string, TsoaRoute.ParameterSchema> = {
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CountryRequest"},
        };
        app.post('/api/countries',
            ...(fetchMiddlewares<RequestHandler>(CountriesController)),
            ...(fetchMiddlewares<RequestHandler>(CountriesController.prototype.createCountry)),

            async function CountriesController_createCountry(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCountriesController_createCountry, request, response });

                const controller = new CountriesController();

              await templateService.apiHandler({
                methodName: 'createCountry',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 201,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCountriesController_updateCountry: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                requestBody: {"in":"body","name":"requestBody","required":true,"ref":"CountryRequest"},
        };
        app.put('/api/countries/:id',
            ...(fetchMiddlewares<RequestHandler>(CountriesController)),
            ...(fetchMiddlewares<RequestHandler>(CountriesController.prototype.updateCountry)),

            async function CountriesController_updateCountry(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCountriesController_updateCountry, request, response });

                const controller = new CountriesController();

              await templateService.apiHandler({
                methodName: 'updateCountry',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCountriesController_deleteCountry: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.delete('/api/countries/:id',
            ...(fetchMiddlewares<RequestHandler>(CountriesController)),
            ...(fetchMiddlewares<RequestHandler>(CountriesController.prototype.deleteCountry)),

            async function CountriesController_deleteCountry(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCountriesController_deleteCountry, request, response });

                const controller = new CountriesController();

              await templateService.apiHandler({
                methodName: 'deleteCountry',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 204,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCountriesController_getCountryById: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
        };
        app.get('/api/countries/:id',
            ...(fetchMiddlewares<RequestHandler>(CountriesController)),
            ...(fetchMiddlewares<RequestHandler>(CountriesController.prototype.getCountryById)),

            async function CountriesController_getCountryById(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCountriesController_getCountryById, request, response });

                const controller = new CountriesController();

              await templateService.apiHandler({
                methodName: 'getCountryById',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_login: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"ref":"LoginRequestBody"},
        };
        app.post('/api/auth/login',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.login)),

            async function AuthController_login(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_login, request, response });

                const controller = new AuthController();

              await templateService.apiHandler({
                methodName: 'login',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_validate: Record<string, TsoaRoute.ParameterSchema> = {
                request: {"in":"request","name":"request","required":true,"dataType":"object"},
        };
        app.get('/api/auth/validate',
            authenticateMiddleware([{"bearerAuth":[]}]),
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.validate)),

            async function AuthController_validate(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_validate, request, response });

                const controller = new AuthController();

              await templateService.apiHandler({
                methodName: 'validate',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_refresh: Record<string, TsoaRoute.ParameterSchema> = {
                authorization: {"in":"header","name":"Authorization","dataType":"string"},
        };
        app.post('/api/auth/refresh',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.refresh)),

            async function AuthController_refresh(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_refresh, request, response });

                const controller = new AuthController();

              await templateService.apiHandler({
                methodName: 'refresh',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAuthController_getCurrentUser: Record<string, TsoaRoute.ParameterSchema> = {
                authorization: {"in":"header","name":"Authorization","dataType":"string"},
        };
        app.get('/api/auth/me',
            ...(fetchMiddlewares<RequestHandler>(AuthController)),
            ...(fetchMiddlewares<RequestHandler>(AuthController.prototype.getCurrentUser)),

            async function AuthController_getCurrentUser(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAuthController_getCurrentUser, request, response });

                const controller = new AuthController();

              await templateService.apiHandler({
                methodName: 'getCurrentUser',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAdminController_uploadProductImage: Record<string, TsoaRoute.ParameterSchema> = {
                id: {"in":"path","name":"id","required":true,"dataType":"string"},
                image: {"in":"formData","name":"image","required":true,"dataType":"file"},
        };
        app.post('/api/admin/products/:id/image',
            authenticateMiddleware([{"bearerAuth":["admin"]}]),
            upload.fields([
                {
                    name: "image",
                    maxCount: 1
                }
            ]),
            ...(fetchMiddlewares<RequestHandler>(AdminController)),
            ...(fetchMiddlewares<RequestHandler>(AdminController.prototype.uploadProductImage)),

            async function AdminController_uploadProductImage(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAdminController_uploadProductImage, request, response });

                const controller = new AdminController();

              await templateService.apiHandler({
                methodName: 'uploadProductImage',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAdminController_loadImagesFromFilesystem: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.post('/api/admin/products/load-images',
            authenticateMiddleware([{"bearerAuth":["admin"]}]),
            ...(fetchMiddlewares<RequestHandler>(AdminController)),
            ...(fetchMiddlewares<RequestHandler>(AdminController.prototype.loadImagesFromFilesystem)),

            async function AdminController_loadImagesFromFilesystem(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAdminController_loadImagesFromFilesystem, request, response });

                const controller = new AdminController();

              await templateService.apiHandler({
                methodName: 'loadImagesFromFilesystem',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsAdminController_importProductsCsv: Record<string, TsoaRoute.ParameterSchema> = {
                csv: {"in":"formData","name":"csv","required":true,"dataType":"file"},
        };
        app.post('/api/admin/products/csv',
            authenticateMiddleware([{"bearerAuth":["admin"]}]),
            upload.fields([
                {
                    name: "csv",
                    maxCount: 1
                }
            ]),
            ...(fetchMiddlewares<RequestHandler>(AdminController)),
            ...(fetchMiddlewares<RequestHandler>(AdminController.prototype.importProductsCsv)),

            async function AdminController_importProductsCsv(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsAdminController_importProductsCsv, request, response });

                const controller = new AdminController();

              await templateService.apiHandler({
                methodName: 'importProductsCsv',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function authenticateMiddleware(security: TsoaRoute.Security[] = []) {
        return async function runAuthenticationMiddleware(request: any, response: any, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            // keep track of failed auth attempts so we can hand back the most
            // recent one.  This behavior was previously existing so preserving it
            // here
            const failedAttempts: any[] = [];
            const pushAndRethrow = (error: any) => {
                failedAttempts.push(error);
                throw error;
            };

            const secMethodOrPromises: Promise<any>[] = [];
            for (const secMethod of security) {
                if (Object.keys(secMethod).length > 1) {
                    const secMethodAndPromises: Promise<any>[] = [];

                    for (const name in secMethod) {
                        secMethodAndPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }

                    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

                    secMethodOrPromises.push(Promise.all(secMethodAndPromises)
                        .then(users => { return users[0]; }));
                } else {
                    for (const name in secMethod) {
                        secMethodOrPromises.push(
                            expressAuthenticationRecasted(request, name, secMethod[name], response)
                                .catch(pushAndRethrow)
                        );
                    }
                }
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            try {
                request['user'] = await Promise.any(secMethodOrPromises);

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }

                next();
            }
            catch(err) {
                // Show most recent error as response
                const error = failedAttempts.pop();
                error.status = error.status || 401;

                // Response was sent in middleware, abort
                if (response.writableEnded) {
                    return;
                }
                next(error);
            }

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
