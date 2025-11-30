# Gmail Email Service Setup Guide

This guide will help you configure Gmail SMTP for sending registration verification emails.

## Step 1: Enable 2-Factor Authentication on Gmail

1. Go to your [Google Account settings](https://myaccount.google.com/)
2. Click on "Security" in the left sidebar
3. Under "How you sign in to Google", click on "2-Step Verification"
4. Follow the setup process to enable 2FA (required for App Passwords)

## Step 2: Generate Gmail App Password

1. After enabling 2FA, go back to "Security" settings
2. Under "How you sign in to Google", click on "App passwords"
3. You might need to re-enter your password
4. Select "Mail" for the app and "Other (custom name)" for device
5. Enter "GoldSphere Server" as the custom name
6. Click "Generate"
7. **IMPORTANT**: Copy the 16-character app password immediately (you won't see it again)

## Step 3: Configure Environment Variables

Update your `.env` file with the following values:

```env
# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.email@gmail.com
SMTP_PASSWORD=your_gmail_app_password_here
FROM_EMAIL=your.email@gmail.com
FRONTEND_URL=http://localhost:8080
```

**Where to save your App Password:**
- Replace `your_gmail_app_password_here` with the 16-character app password from Step 2
- Replace `your.email@gmail.com` with your actual Gmail address
- Keep the app password secure - treat it like a password

## Step 4: Test Email Configuration

Test your email setup:

```bash
# Test connection only
npm run test:email

# Test connection and send a test email
npm run test:email your.email@gmail.com
```

## Step 5: Alternative - iCloud Email Setup

If you prefer iCloud, update these values instead:

```env
# Email Configuration (iCloud SMTP)
SMTP_HOST=smtp.mail.me.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.username@icloud.com
SMTP_PASSWORD=your_icloud_app_password
FROM_EMAIL=your.username@icloud.com
FRONTEND_URL=http://localhost:8080
```

For iCloud App Passwords:
1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in and go to "Security" section
3. Under "App-Specific Passwords", click "Generate Password"
4. Enter "GoldSphere Server" as the label
5. Use the generated password in your .env file

## Security Best Practices

1. **Never commit .env files** - they're already in .gitignore
2. **Use App Passwords, not your main password**
3. **Rotate passwords periodically**
4. **Use different app passwords for different applications**
5. **Monitor your email account for suspicious activity**

## Troubleshooting

### Common Issues:

1. **"Invalid login"** - Check your Gmail address and app password
2. **"Less secure app access"** - Gmail requires App Passwords (not your regular password)
3. **Connection timeout** - Check your internet connection and firewall settings
4. **"Authentication failed"** - Ensure 2FA is enabled and you're using an App Password

### Testing Commands:

```bash
# Basic connection test
npm run test:email

# Send test email to yourself
npm run test:email your.email@gmail.com

# Check environment variables
node -e "require('dotenv').config(); console.log(process.env.SMTP_USER, process.env.SMTP_PASSWORD ? '[SET]' : '[NOT SET]')"
```

## Production Deployment

For production, consider:

1. **Use environment-specific .env files** (.env.prod)
2. **Consider dedicated email services** (SendGrid, AWS SES, Mailgun)
3. **Monitor email delivery rates and bounces**
4. **Set up proper SPF/DKIM records** for your domain
5. **Use a dedicated email domain** (e.g., noreply@yourdomain.com)

---

After completing these steps, your registration emails will be sent through Gmail SMTP.
