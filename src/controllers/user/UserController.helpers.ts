/**
 * User Controller Helpers
 */

import { getPool } from '../../dbConfig';
import {
  UserServiceFactory,
  UserErrorCode,
} from '../../services/user';
import type { IUserService } from '../../services/user/service/IUserService';

export function getUserService(): IUserService {
  return UserServiceFactory.createUserService(getPool());
}

export function mapErrorCodeToStatus(errorCode?: UserErrorCode): number {
  switch (errorCode) {
    case UserErrorCode.USER_NOT_FOUND:
      return 404;
    case UserErrorCode.EMAIL_ALREADY_EXISTS:
    case UserErrorCode.USER_HAS_DEPENDENCIES:
    case UserErrorCode.USER_ALREADY_BLOCKED:
    case UserErrorCode.USER_NOT_BLOCKED:
    case UserErrorCode.INVALID_STATUS_TRANSITION:
      return 409;
    case UserErrorCode.INVALID_EMAIL_FORMAT:
    case UserErrorCode.INVALID_PASSWORD:
    case UserErrorCode.VALIDATION_ERROR:
      return 400;
    case UserErrorCode.UNAUTHORIZED:
    case UserErrorCode.CANNOT_BLOCK_SELF:
      return 403;
    default:
      return 500;
  }
}
