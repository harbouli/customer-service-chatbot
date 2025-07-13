import { IEmailService } from "../../interfaces/IEmailService";
import { CustomerCreatedEvent } from "../customer-created-event";
import { IEventHandler } from "../IEventHandler";

export class CustomerCreatedHandler
  implements IEventHandler<CustomerCreatedEvent>
{
  constructor(private emailService: IEmailService) {}

  async handle(event: CustomerCreatedEvent): Promise<void> {
    try {
      await this.emailService.sendWelcomeEmail(
        event.customer.email,
        event.customer.name
      );
      console.log(`Welcome email sent to ${event.customer.email}`);
    } catch (error) {
      console.error("Failed to send welcome email:", error);
    }
  }
}
