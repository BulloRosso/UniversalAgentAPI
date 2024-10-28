// src/chat/chat.controller.ts
import { Controller, Post, Body, Logger, BadRequestException } from '@nestjs/common';
import { ChatService } from './chat.service';

interface ChatRequest {
  thread_id?: string;
  userMessage: string;
  assistant_id?: string;
}

@Controller('api/chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Post()
  async handleChat(@Body() chatRequest: ChatRequest) {
    try {
      const { thread_id, userMessage } = this.trimObjectStrings(chatRequest);
      const assistant_id = chatRequest.assistant_id || process.env['OPENAI_AGENT_ID'];

      if (!assistant_id) {
        throw new BadRequestException('No assistant ID provided and OPENAI_AGENT_ID not set');
      }

      this.logger.log(`Assistant ID: ${assistant_id}`);
      this.logger.log(`Thread ID: ${thread_id}`);
      this.logger.log(`Message: ${userMessage}`);

      // Get or create thread
      let threadId = thread_id;
      if (!threadId?.match(/^thread_/)) {
        const thread = await this.chatService.createThread();
        threadId = thread.id;
        this.logger.log(`Thread created: ${threadId}`);
      }

      // Process message
      this.logger.log('Processing message in run');
      await this.chatService.addMessage(threadId, userMessage);

      // Run assistant with verified IDs
      await this.chatService.runAssistant(assistant_id, threadId);

      return { threadId };

    } catch (error) {
      this.logger.error('Error handling chat request:', error.message);
      throw error;
    }
  }

  private trimObjectStrings(obj: any): any {
    return Object.keys(obj).reduce((acc, key) => {
      acc[key] = typeof obj[key] === 'string' ? obj[key].trim() : obj[key];
      return acc;
    }, {} as any);
  }
}