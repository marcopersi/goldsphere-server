/**
 * Email Service Types
 * 
 * Type definitions for email domain
 */

import nodemailer from 'nodemailer';

/**
 * Email configuration for SMTP settings
 */
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

/**
 * User information for personalized emails
 */
export interface EmailUserInfo {
  firstName: string;
  lastName: string;
}

/**
 * Email service configuration
 */
export interface EmailServiceConfig {
  baseUrl: string;
  fromEmail: string;
  transporter?: nodemailer.Transporter;
}
