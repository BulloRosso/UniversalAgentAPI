// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { LectureModule } from './lecture/lecture.module';
import { ChatModule } from './chat/chat.module';
import { SessionModule } from './session/session.module';
import { NarrativeModule } from './narrative/narrative.module';
import { QuestionModule } from './questions/question.module';

@Module({
  imports: [ChatModule, 
            NarrativeModule, 
            LectureModule, 
            SessionModule,
            QuestionModule],
  controllers: [AppController],
})
export class AppModule {}