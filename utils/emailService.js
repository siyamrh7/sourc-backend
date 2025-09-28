const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // For development, use a test configuration
      // In production, you would use your actual SMTP settings
      if (process.env.NODE_ENV === 'production') {
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
          }
        });
      } else {
        // For development, create a test account
        this.createTestAccount();
      }
    } catch (error) {
      console.error('Error initializing email transporter:', error);
    }
  }

  async createTestAccount() {
    try {
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      
      console.log('📧 Test email account created:');
      console.log('   User:', testAccount.user);
      console.log('   Pass:', testAccount.pass);
    } catch (error) {
      console.error('Error creating test email account:', error);
    }
  }

  async sendPasswordResetEmail(email, resetToken) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: `"Sourc Support" <${process.env.FROM_EMAIL || 'noreply@sourc.com'}>`,
        to: email,
        subject: 'Password Reset Request - Sourc',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>You have requested to reset your password for your Sourc account. Click the button below to reset your password:</p>
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <p><strong>This link will expire in 10 minutes.</strong></p>
                <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
                <div class="footer">
                  <p>© Sourc. All rights reserved.</p>
                  <p>Need help? Contact us at support@sourc.com</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Password Reset Request
          
          Hello,
          
          You have requested to reset your password for your Sourc account.
          
          Please click the following link to reset your password:
          ${resetUrl}
          
          This link will expire in 10 minutes.
          
          If you didn't request this password reset, please ignore this email and your password will remain unchanged.
          
          © Sourc. All rights reserved.
          Need help? Contact us at support@sourc.com
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Password reset email sent successfully!');
        console.log('   Preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(email, name) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: `"Sourc Team" <${process.env.FROM_EMAIL || 'noreply@sourc.com'}>`,
        to: email,
        subject: 'Welcome to Sourc!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Sourc</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Sourc!</h1>
              </div>
              <div class="content">
                <p>Hello ${name},</p>
                <p>Welcome to Sourc! We're excited to have you on board.</p>
                <p>You can now access your customer dashboard to track your orders and manage your profile.</p>
                <div style="text-align: center;">
                  <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/customer-dashboard" class="button">Go to Dashboard</a>
                </div>
                <p>If you have any questions, feel free to reach out to our support team.</p>
                <div class="footer">
                  <p>© Sourc. All rights reserved.</p>
                  <p>Need help? Contact us at support@sourc.com</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Welcome email sent successfully!');
        console.log('   Preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService(); 