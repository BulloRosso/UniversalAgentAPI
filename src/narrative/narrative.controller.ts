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

    this.logger.debug(`Attempting to generate narrative for: ${narrative}`);
    
    try {
      const mp3 = await this.openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: narrative,
        response_format: "mp3",
      });

      // Set headers for streaming
      res.set({
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      // Convert the arrayBuffer to a Stream
      const buffer = Buffer.from(await mp3.arrayBuffer());
      const chunkSize = 16 * 1024; // 16KB chunks

      this.logger.debug('Streaming narrative audio');
      
      // Stream the buffer in chunks
      for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.slice(i, i + chunkSize);
        res.write(chunk);
      }

      // End the response
      res.end();

    } catch (error) {
      this.logger.error('Error generating speech:', error);
      if (!res.headersSent) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Error generating speech' });
      } else {
        res.end();
      }
    }
  }}