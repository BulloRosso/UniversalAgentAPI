// src/lecture/lecture.controller.ts
import { Controller, Get, Param, Post, Body, Logger } from '@nestjs/common';
import { LectureService } from './lecture.service';

@Controller('api/lecture')
export class LectureController {
  private readonly logger = new Logger(LectureController.name);

  constructor(private readonly lectureService: LectureService) {}

  @Get(':lectureId')
  async getLecture(@Param('lectureId') lectureId: string) {
    this.logger.debug(`Getting lecture with ID: ${lectureId}`);
    try {
      const result = await this.lectureService.getLecture(lectureId);
      this.logger.debug('Successfully retrieved lecture');
      return result;
    } catch (error) {
      this.logger.error(`Error getting lecture: ${error.message}`);
      throw error;
    }
  }

  @Get('test')
  async test() {
    this.logger.debug('Test endpoint called');
    return { message: 'API is working' };
  }
}