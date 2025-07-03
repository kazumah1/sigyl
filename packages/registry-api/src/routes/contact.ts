import express from 'express';
import nodemailer from 'nodemailer'; // Email service for contact form
import { z } from 'zod';
import { APIResponse } from '../types';

const router = express.Router();

// Contact form validation schema
const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  reason: z.string().min(1, 'Reason is required').max(50, 'Reason too long'),
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long')
});

// Email transporter configuration
const createTransporter = () => {
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : undefined;

  if (!emailUser || !emailPass) {
    throw new Error('Email configuration missing: EMAIL_USER and EMAIL_PASS required');
  }

  const config: any = {
    auth: {
      user: emailUser,
      pass: emailPass,
    }
  };

  // Use custom SMTP if host is provided, otherwise use service
  if (emailHost) {
    config.host = emailHost;
    if (emailPort) config.port = emailPort;
    config.secure = emailPort === 465; // true for 465, false for other ports
  } else {
    config.service = emailService;
  }

  return nodemailer.createTransport(config);
};

// Generate confirmation email HTML
const generateConfirmationEmail = (name: string, reason: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank you for contacting Sigyl</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Thank you for contacting Sigyl!</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>Thank you for reaching out to us regarding <strong>${reason}</strong>. We've received your message and our team will get back to you within 24 hours.</p>
          <p>In the meantime, you can:</p>
          <ul>
            <li>Check out our <a href="https://sigyl.dev/docs">documentation</a></li>
            <li>Explore our <a href="https://sigyl.dev/marketplace">MCP marketplace</a></li>
            <li>Join our <a href="https://discord.gg/sigyl">Discord community</a></li>
          </ul>
          <p>If you have any urgent questions, feel free to reach out to us at <a href="mailto:info@sigyl.dev">info@sigyl.dev</a>.</p>
          <p>Best regards,<br>The Sigyl Team</p>
        </div>
        <div class="footer">
          <p>© 2025 Sigyl. All rights reserved.</p>
          <p><a href="https://sigyl.dev">sigyl.dev</a> | <a href="https://sigyl.dev/privacy">Privacy Policy</a> | <a href="https://sigyl.dev/terms">Terms of Service</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate notification email HTML for the team
const generateNotificationEmail = (name: string, email: string, reason: string, message: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Form Submission - ${reason}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #495057; }
        .value { background: white; padding: 10px; border-radius: 5px; border-left: 4px solid #667eea; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>New Contact Form Submission</h2>
          <p>Reason: ${reason}</p>
        </div>
        <div class="content">
          <div class="field">
            <div class="label">Name:</div>
            <div class="value">${name}</div>
          </div>
          <div class="field">
            <div class="label">Email:</div>
            <div class="value"><a href="mailto:${email}">${email}</a></div>
          </div>
          <div class="field">
            <div class="label">Reason:</div>
            <div class="value">${reason}</div>
          </div>
          <div class="field">
            <div class="label">Message:</div>
            <div class="value">${message.replace(/\n/g, '<br>')}</div>
          </div>
          <div class="field">
            <div class="label">Submitted:</div>
            <div class="value">${new Date().toLocaleString()}</div>
          </div>
        </div>
        <div class="footer">
          <p>This email was sent from the Sigyl contact form.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// POST /api/v1/contact - Submit contact form
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const validationResult = contactFormSchema.safeParse(req.body);
    if (!validationResult.success) {
      const response: APIResponse<null> = {
        success: false,
        error: 'Validation Error',
        message: validationResult.error.errors[0].message
      };
      return res.status(400).json(response);
    }

    const { name, email, reason, message } = validationResult.data;

    // Create email transporter
    const transporter = createTransporter();

    // Send confirmation email to user
    const confirmationEmail = {
      from: `"Sigyl Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Thank you for contacting Sigyl - We\'ll get back to you soon!',
      html: generateConfirmationEmail(name, reason)
    };

    // Send notification email to team
    const notificationEmail = {
      from: `"Sigyl Contact Form" <${process.env.EMAIL_USER}>`,
      to: process.env.TEAM_EMAIL || 'info@sigyl.dev',
      subject: `New Contact Form Submission: ${reason}`,
      html: generateNotificationEmail(name, email, reason, message)
    };

    // Send both emails
    await Promise.all([
      transporter.sendMail(confirmationEmail),
      transporter.sendMail(notificationEmail)
    ]);

    // Log successful submission
    // console.log(`Contact form submitted successfully: ${name} (${email}) - ${reason}`);

    const response: APIResponse<{ message: string }> = {
      success: true,
      data: { message: 'Contact form submitted successfully' },
      message: 'Thank you for your message. We\'ll get back to you within 24 hours!'
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Contact form submission error:', error);
    
    const response: APIResponse<null> = {
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to submit contact form. Please try again later.'
    };

    res.status(500).json(response);
  }
});

// GET /api/v1/contact - Health check for contact endpoint
router.get('/', (_req, res) => {
  const response: APIResponse<{ status: string; emailConfigured: boolean }> = {
    success: true,
    data: {
      status: 'Contact endpoint is operational',
      emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
    },
    message: 'Contact form endpoint is ready'
  };
  res.json(response);
});

export default router; 