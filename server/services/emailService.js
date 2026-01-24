const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  init() {
    // Create transporter for development (you can configure this for production)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'sdukuziyaremye@gmail.com',
        pass: process.env.SMTP_PASS || 'uhld qafs etps fbro'
      }
    });

    // For development: Create a test account if Gmail fails
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
      this.createTestAccount();
    }
  }

  async createTestAccount() {
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('📧 Using Ethereal Email for development:', testAccount.user);
    } catch (error) {
      console.error('❌ Failed to create test email account:', error);
    }
  }

  async sendEmail(to, subject, htmlContent) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'LikaBoutiques <sdukuziyaremye@gmail.com>',
        to: to,
        subject: subject,
        html: htmlContent
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${to}: ${info.messageId}`);

      // For Ethereal Email, log the preview URL
      if (info.messageId && info.messageId.includes('ethereal')) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`📧 Preview URL: ${previewUrl}`);
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendBirthdayEmail(customer) {
    const subject = `🎉 Happy Birthday, ${customer.first_name}! 🎂`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Happy Birthday!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .birthday-icon { font-size: 48px; margin-bottom: 20px; }
          .offer { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="birthday-icon">🎂</div>
            <h1>Happy Birthday, ${customer.first_name}! 🎉</h1>
            <p>Wishing you a fantastic day filled with joy and happiness!</p>
          </div>
          
          <div class="content">
            <h2>Dear ${customer.first_name} ${customer.last_name},</h2>
            
            <p>On this special day, we want to celebrate you! 🎊</p>
            
            <p>As a valued customer of LikaBoutiques, we're excited to offer you a special birthday treat:</p>
            
            <div class="offer">
              <h3>🎁 Birthday Special Offer</h3>
              <p><strong>20% OFF</strong> on your next purchase!</p>
              <p>Use code: <strong>BIRTHDAY${new Date().getFullYear()}</strong></p>
              <p><em>Valid until the end of this month</em></p>
            </div>
            
            <p>We appreciate your loyalty and look forward to serving you for many more years to come!</p>
            
            <p>Best wishes,<br>
            <strong>The LikaBoutiques Team</strong></p>
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="btn">Visit Our Store</a>
          </div>
          
          <div class="footer">
            <p>This email was sent to ${customer.email}</p>
            <p>LikaBoutiques | Customer Care</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(customer.email, subject, htmlContent);
  }

  async sendAnniversaryEmail(customer) {
    const subject = `💝 Happy Anniversary, ${customer.first_name}! 🎊`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Happy Anniversary!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .anniversary-icon { font-size: 48px; margin-bottom: 20px; }
          .offer { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .btn { display: inline-block; background: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="anniversary-icon">💝</div>
            <h1>Happy Anniversary, ${customer.first_name}! 🎊</h1>
            <p>Celebrating this special milestone with you!</p>
          </div>
          
          <div class="content">
            <h2>Dear ${customer.first_name} ${customer.last_name},</h2>
            
            <p>Congratulations on your anniversary! 🎉</p>
            
            <p>We're honored to be part of your journey and want to celebrate this special occasion with you:</p>
            
            <div class="offer">
              <h3>🎁 Anniversary Special Offer</h3>
              <p><strong>25% OFF</strong> on your next purchase!</p>
              <p>Use code: <strong>ANNIVERSARY${new Date().getFullYear()}</strong></p>
              <p><em>Valid until the end of this month</em></p>
            </div>
            
            <p>Thank you for choosing LikaBoutiques. We look forward to many more years of serving you!</p>
            
            <p>Best wishes,<br>
            <strong>The LikaBoutiques Team</strong></p>
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="btn">Visit Our Store</a>
          </div>
          
          <div class="footer">
            <p>This email was sent to ${customer.email}</p>
            <p>LikaBoutiques | Customer Care</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(customer.email, subject, htmlContent);
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
