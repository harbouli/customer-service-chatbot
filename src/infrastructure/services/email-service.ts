import { IEmailService } from '../../application/interfaces/IEmailService';

export class EmailService implements IEmailService {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    try {
      // In a real implementation, you would use a service like SendGrid, AWS SES, or nodemailer
      console.log(`📧 Sending email to: ${to}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📧 Body: ${body.substring(0, 100)}...`);

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log(`✅ Email sent successfully to ${to}`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      throw new Error(`Email sending failed: ${error}`);
    }
  }

  async sendWelcomeEmail(customerEmail: string, customerName: string): Promise<void> {
    const subject = 'Welcome to Our Store!';
    const body = `
Dear ${customerName},

Welcome to our store! We're excited to have you as a customer.

Our AI-powered chatbot is available 24/7 to help you with:
- Product recommendations
- Order tracking
- Customer support
- General inquiries

If you have any questions, don't hesitate to start a chat with us.

Best regards,
The Support Team
    `.trim();

    await this.sendEmail(customerEmail, subject, body);
  }

  async sendSupportTicketEmail(customerEmail: string, ticketId: string): Promise<void> {
    const subject = `Support Ticket Created - ${ticketId}`;
    const body = `
Dear Customer,

Your support ticket has been created successfully.

Ticket ID: ${ticketId}
Status: Open
Expected Response Time: 24 hours

You can track your ticket status in your account dashboard or reply to this email.

Best regards,
The Support Team
    `.trim();

    await this.sendEmail(customerEmail, subject, body);
  }
}
