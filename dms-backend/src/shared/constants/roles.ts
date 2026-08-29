/**
 * System roles.
 */
export enum Role {
  CONVERT = 'convert',
  ADMIN = 'admin',
  MENTOR = 'mentor',
  SUPER_ADMIN = 'super_admin',
}

/**
 * All valid role values as a string array (for Zod validation).
 */
export const ROLE_VALUES = Object.values(Role) as [string, ...string[]];
