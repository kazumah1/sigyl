import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testEmailConfiguration = async () => {
  console.log('Testing email configuration...\n');

  // Check environment variables
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : undefined;

  console.log('Email Configuration:');
  console.log(`- Service: ${emailService}`);
  console.log(`- User: ${emailUser ? '✓ Set' : '✗ Missing'}`);
  console.log(`- Password: ${emailPass ? '✓ Set' : '✗ Missing'}`);
  if (emailHost) {
    console.log(`- Host: ${emailHost}`);
    console.log(`- Port: ${emailPort || 'Default'}`);
  }
  console.log('');

  if (!emailUser || !emailPass) {
    console.error('❌ Email configuration incomplete. Please set EMAIL_USER and EMAIL_PASS in your .env file.');
    process.exit(1);
  }

  try {
    // Create transporter
    const config: any = {
      auth: {
        user: emailUser,
        pass: emailPass,
      }
    };

    if (emailHost) {
      config.host = emailHost;
      if (emailPort) config.port = emailPort;
      config.secure = emailPort === 465;
    } else {
      config.service = emailService;
    }

    const transporter = nodemailer.createTransport(config);

    // Test connection
    console.log('Testing email connection...');
    await transporter.verify();
    console.log('✅ Email connection successful!\n');

    // Test sending a simple email
    console.log('Testing email sending...');
    const testEmail = {
      from: `"Sigyl Test" <${emailUser}>`,
      to: emailUser, // Send to self for testing
      subject: 'Sigyl Contact Form Test',
      text: 'This is a test email from the Sigyl contact form system.',
      html: `
        <h2>Sigyl Contact Form Test</h2>
        <p>This is a test email to verify the contact form email system is working correctly.</p>
        <p><strong>Configuration:</strong></p>
        <ul>
          <li>Service: ${emailService}</li>
          <li>User: ${emailUser}</li>
          <li>Host: ${emailHost || 'Default'}</li>
          <li>Port: ${emailPort || 'Default'}</li>
        </ul>
        <p>If you receive this email, the contact form system is ready to use!</p>
      `
    };

    const info = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log(`Message ID: ${info.messageId}`);

    console.log('\n🎉 Email configuration is working correctly!');
    console.log('The contact form system is ready to use.');

  } catch (error) {
    console.error('❌ Email test failed:', error);
    process.exit(1);
  }
};

// Run the test
testEmailConfiguration().catch(console.error); 