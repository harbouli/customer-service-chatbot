export interface IEmailService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendWelcomeEmail(customerEmail: string, customerName: string): Promise<void>;
  sendSupportTicketEmail(
    customerEmail: string,
    ticketId: string
  ): Promise<void>;
}
