// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [SessionModule],  // Import SessionModule to use its exported providers
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}