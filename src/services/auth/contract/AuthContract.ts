import { z } from 'zod';

export const AuthUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.string().min(1),
}).strict();

export const AuthSessionDataSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().positive(),
  expiresAt: z.string().datetime(),
  issuedAt: z.string().datetime().optional(),
  user: AuthUserSchema,
}).strict();

export const SessionSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: AuthSessionDataSchema,
}).strict();

export const UserSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: AuthUserSchema,
  }).strict(),
}).strict();

export type AuthUser = z.infer<typeof AuthUserSchema>;
export type AuthSessionData = z.infer<typeof AuthSessionDataSchema>;
export type SessionSuccessResponse = z.infer<typeof SessionSuccessResponseSchema>;
export type UserSuccessResponse = z.infer<typeof UserSuccessResponseSchema>;

export function serializeSessionSuccessResponse(value: SessionSuccessResponse): SessionSuccessResponse {
  return SessionSuccessResponseSchema.parse(value);
}

export function serializeUserSuccessResponse(value: UserSuccessResponse): UserSuccessResponse {
  return UserSuccessResponseSchema.parse(value);
}
