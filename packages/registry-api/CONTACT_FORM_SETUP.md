# Contact Form Email System Setup

This document explains how to set up the robust contact form email system for Sigyl using Zoho Mail.

## Overview

The contact form system provides:
- ✅ **Confirmation emails** to users who submit the form (sent from admin@sigyl.dev)
- ✅ **Notification emails** to the team at info@sigyl.dev
- ✅ **Form validation** and rate limiting
- ✅ **Database storage** for record keeping
- ✅ **Error handling** and logging
- ✅ **Beautiful HTML email templates**

## Email Configuration

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Email Configuration - Zoho Mail
EMAIL_USER=admin@sigyl.dev
EMAIL_PASS=your-zoho-password-here
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=587
TEAM_EMAIL=info@sigyl.dev
```

### 2. Email Provider Setup

#### Zoho Mail (Current Setup)
- **Sender Email:** admin@sigyl.dev (for sending confirmation emails to users)
- **Team Email:** info@sigyl.dev (receives contact form notifications)
- **SMTP Host:** smtp.zoho.com
- **SMTP Port:** 587
- **Authentication:** Username/password

#### Other Email Providers
For providers like Gmail, SendGrid, or Mailgun:
```bash
# Gmail
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# SendGrid
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

### 3. Testing Email Configuration

Run the test script to verify your email setup:

```bash
cd packages/registry-api
npm run test:contact
```

This will:
- ✅ Verify your email configuration
- ✅ Test the connection to Zoho SMTP
- ✅ Send a test email to admin@sigyl.dev
- ✅ Confirm the system is ready

## API Endpoints

### POST /api/v1/contact
Submit a contact form with email notifications.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "reason": "demo",
  "message": "I'd like to schedule a demo of your platform."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Contact form submitted successfully"
  },
  "message": "Thank you for your message. We'll get back to you within 24 hours!"
}
```

### GET /api/v1/contact
Health check for the contact endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "Contact endpoint is operational",
    "emailConfigured": true
  },
  "message": "Contact form endpoint is ready"
}
```

## Email Templates

### User Confirmation Email
- **From:** admin@sigyl.dev
- **Subject:** "Thank you for contacting Sigyl - We'll get back to you soon!"
- **Content:** Professional confirmation with links to docs, marketplace, and Discord
- **Design:** Beautiful gradient header with Sigyl branding

### Team Notification Email
- **From:** admin@sigyl.dev
- **To:** info@sigyl.dev
- **Subject:** "New Contact Form Submission: [reason]"
- **Content:** Detailed form submission with all user information
- **Design:** Clean layout with highlighted form fields

## Frontend Integration

The frontend (`packages/web/src/pages/Contact.tsx`) has been updated to:

1. **Send to API first** for email notifications
2. **Store in Supabase** for record keeping
3. **Show loading states** during submission
4. **Display success/error messages** with helpful information
5. **Reset form** on successful submission

## Rate Limiting

The contact endpoint uses the general rate limit:
- **100 requests per 15 minutes** per IP address
- Prevents spam and abuse

## Error Handling

The system handles various error scenarios:

- **Validation errors:** Invalid email, missing fields, etc.
- **Email sending failures:** Network issues, authentication problems
- **Database errors:** Supabase connection issues (non-blocking)
- **Rate limiting:** Too many requests

## Monitoring and Logging

- All contact form submissions are logged to console
- Email sending errors are logged with details
- Database storage errors are logged but don't block email sending

## Security Features

- **Input validation** using Zod schemas
- **Rate limiting** to prevent abuse
- **CORS protection** for cross-origin requests
- **Request size limits** to prevent DoS attacks
- **Email sanitization** to prevent injection attacks

## Deployment Checklist

Before deploying to production:

1. ✅ Set up Zoho email credentials
2. ✅ Test email configuration with `npm run test:contact`
3. ✅ Verify environment variables are set
4. ✅ Test the full contact form flow
5. ✅ Check email delivery to both user and team
6. ✅ Monitor logs for any issues

## Troubleshooting

### Email Not Sending
1. Check environment variables are set correctly
2. Verify Zoho SMTP credentials
3. Run `npm run test:contact` to test configuration
4. Check server logs for error details

### Frontend Errors
1. Verify API endpoint is accessible
2. Check CORS configuration
3. Ensure `VITE_REGISTRY_API_URL` is set correctly

### Database Issues
1. Check Supabase connection
2. Verify `emails` table exists
3. Check database permissions

## Support

If you encounter issues:
1. Check the server logs for detailed error messages
2. Run the test script to verify email configuration
3. Contact the development team with error details 