// src/narrative/narrative.module.ts
import { Module } from '@nestjs/common';
import { NarrativeController } from './narrative.controller';

@Module({
  controllers: [NarrativeController],
})
export class NarrativeModule {}