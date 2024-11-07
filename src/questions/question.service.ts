// question.service.ts
import { Client } from '@replit/object-storage';
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Question, QuestionsResponse } from './question.interface';

@Injectable()
export class QuestionService {

  private readonly storageClient: Client;
  private readonly logger = new Logger(QuestionService.name);

  constructor() {
    this.storageClient = new Client();
    this.logger.debug('QuestionService initialized');
  }
  
  async getQuestions(lessonId: string): Promise<Question[]> {
   try {
      const key = `questions-${lessonId}.json`;
      const { ok, value, error } = await this.storageClient.downloadAsText(key);

      if (!ok || error) {
        this.logger.error(`Failed to find questions: ${error}`);
        throw new NotFoundException(`Questions for lesson with ID ${lessonId} not found`);
      }

      this.logger.debug('Successfully retrieved questions from storage');
      return JSON.parse(value) as Question[];
    }
  } catch (error: any) {
    this.logger.error(`Error getting questions: ${error.message}`);
    throw error;
  }

}