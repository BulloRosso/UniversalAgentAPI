// src/lecture/lecture.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Client } from '@replit/object-storage';
import { Lecture } from '../types';

@Injectable()
export class LectureService {
  private readonly storageClient: Client;
  private readonly logger = new Logger(LectureService.name);

  constructor() {
    this.storageClient = new Client();
    this.logger.debug('LectureService initialized');
  }

  async getLecture(lectureId: string): Promise<Lecture> {
    this.logger.debug(`Attempting to get lecture: ${lectureId}`);

    try {
      const key = `lecture-${lectureId}.json`;
      this.logger.debug(`Looking for key: ${key}`);

      const { ok, value, error } = await this.storageClient.downloadAsText(key);

      if (!ok || error) {
        this.logger.error(`Failed to find lecture: ${error}`);
        throw new NotFoundException(`Lecture with ID ${lectureId} not found`);
      }

      this.logger.debug('Successfully retrieved lecture from storage');
      return JSON.parse(value) as Lecture;
    } catch (error) {
      this.logger.error(`Error in getLecture: ${error.message}`);
      throw error;
    }
  }
}