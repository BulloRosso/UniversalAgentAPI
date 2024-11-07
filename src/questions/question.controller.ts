// question.controller.ts
import { Controller, Get, Param, Post, Body, HttpStatus } from '@nestjs/common';
import { QuestionService } from './question.service';
import { Question } from './question.interface';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('questions')
@Controller('api/questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Get(':lessonId')
  @ApiOperation({ summary: 'Get questions for a specific lesson' })
  @ApiParam({ name: 'lessonId', description: 'The ID of the lesson' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Questions retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Questions not found' })
  async getQuestions(@Param('lessonId') lessonId: string): Promise<Question[]> {
    return this.questionService.getQuestions(lessonId);
  }

}