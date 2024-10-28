// src/narrative/narrative.controller.ts
import { Controller, Post, Body, Res, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import OpenAI from 'openai';

@Controller('api/narrative')
export class NarrativeController {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(NarrativeController.name);

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  @Post('/tell')
  async tellNarrative(
    @Body('narrative') narrative: string,
    @Res() res: Response,
  ) {
    if (!narrative) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Text of narrative is required' });
    }

    try {
      const mp3 = await this.openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: narrative,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());

      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length,
      });

      return res.send(buffer);
    } catch (error) {
      this.logger.error('Error generating speech:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Error generating speech' });
    }
  }
}