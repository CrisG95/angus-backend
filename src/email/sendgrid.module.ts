import { Module } from '@nestjs/common';
import { SendGridService } from '@SendGrid/sendgrid.service';

@Module({
  imports: [],
  providers: [SendGridService],
  controllers: [],
  exports: [SendGridService],
})
export class SendGridModule {}
