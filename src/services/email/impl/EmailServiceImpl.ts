/**
 * Email Service Implementation
 * 
 * Handles email sending for user verification and notifications.
 * Uses nodemailer with SMTP for sending emails.
 */

import nodemailer from 'nodemailer';
import { IEmailService } from '../IEmailService';
import { EmailUserInfo, EmailServiceConfig } from '../types/EmailTypes';

export class EmailServiceImpl implements IEmailService {
  private readonly baseUrl: string;
  private readonly fromEmail: string;
  private readonly transporter: nodemailer.Transporter;

  constructor(config: EmailServiceConfig) {
    this.baseUrl = config.baseUrl;
    this.fromEmail = config.fromEmail;
    this.transporter = config.transporter || this.createDefaultTransporter();
  }

  private createDefaultTransporter(): nodemailer.Transporter {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number.parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || ''
      }
    });
  }

  async sendEmailVerification(
    email: string,
    token: string,
    userInfo: EmailUserInfo
  ): Promise<void> {
    try {
      const verificationUrl = `${this.baseUrl}/api/auth/verify-email?token=${token}`;
      
      const mailOptions = {
        from: this.fromEmail,
        to: email,
        subject: 'Verify your GoldSphere account',
        html: this.generateVerificationEmailHtml(userInfo.firstName, verificationUrl),
        text: this.generateVerificationEmailText(userInfo.firstName, verificationUrl),
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ Email verification sent to ${email}`, {
        messageId: info.messageId,
        verificationUrl
      });
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }

  private generateVerificationEmailHtml(firstName: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify your GoldSphere account</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #007bff; 
            color: white; 
            text-decoration: none; 
            border-radius: 4px; 
            margin: 20px 0;
          }
          .footer { font-size: 12px; color: #666; text-align: center; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to GoldSphere!</h1>
          </div>
          
          <div class="content">
            <h2>Hi ${firstName},</h2>
            
            <p>Thank you for registering with GoldSphere. To complete your account setup, please verify your email address by clicking the button below:</p>
            
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            
            <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${verificationUrl}</p>
            
            <p>This verification link will expire in 24 hours for security reasons.</p>
            
            <p>If you didn't create an account with us, please ignore this email.</p>
            
            <p>Best regards,<br>The GoldSphere Team</p>
          </div>
          
          <div class="footer">
            <p>© 2025 GoldSphere. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateVerificationEmailText(firstName: string, verificationUrl: string): string {
    return `
Welcome to GoldSphere!

Hi ${firstName},

Thank you for registering with GoldSphere. To complete your account setup, please verify your email address by visiting the following link:

${verificationUrl}

This verification link will expire in 24 hours for security reasons.

If you didn't create an account with us, please ignore this email.

Best regards,
The GoldSphere Team

© 2025 GoldSphere. All rights reserved.
This is an automated message, please do not reply to this email.
    `.trim();
  }
}
