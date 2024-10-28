// src/session/session.service.ts
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Client } from '@replit/object-storage';
import { Session, ChatMessage } from '../types';

@Injectable()
export class SessionService {
  private readonly storageClient: Client;

  constructor() {
    this.storageClient = new Client();
  }

  async createSession(teacherId: string, lectureId: string, lessonId: string): Promise<string> {
    const sessionId: string = uuidv4();
    const session: Session = {
      sessionId,
      teacherId,
      lectureId,
      lessonId,
      lastPresentationStepNumber: 0,
      chat: [],
    };

    const { ok, error } = await this.storageClient.uploadFromText(
      `session-${sessionId}.json`,
      JSON.stringify(session)
    );

    if (!ok || error) {
      throw new Error('Failed to create session');
    }

    return sessionId;
  }

  async getLastStep(sessionId: string): Promise<number> {
    const { ok, value, error } = await this.storageClient.downloadAsText(`session-${sessionId}.json`);
    if (!ok || error) {
      throw new Error('Session not found');
    }
    const session: Session = JSON.parse(value);
    return session.lastPresentationStepNumber;
  }

  async addChatMessage(sessionId: string, role: 'user' | 'tutor', message: string): Promise<void> {
    const { ok, value, error } = await this.storageClient.downloadAsText(`session-${sessionId}.json`);
    if (!ok || error) {
      throw new Error('Session not found');
    }

    const session: Session = JSON.parse(value);
    const chatMessage: ChatMessage = {
      timestamp: new Date().toISOString(),
      role,
      message,
    };

    session.chat.push(chatMessage);

    const { ok: saveOk, error: saveError } = await this.storageClient.uploadFromText(
      `session-${sessionId}.json`,
      JSON.stringify(session)
    );

    if (!saveOk || saveError) {
      throw new Error('Failed to save chat message');
    }
  }

  async getSession(sessionId: string): Promise<Session> {
    const { ok, value, error } = await this.storageClient.downloadAsText(`session-${sessionId}.json`);
    if (!ok || error) {
      throw new Error('Session not found');
    }
    return JSON.parse(value) as Session;
  }

  async updateLastStep(sessionId: string, stepNumber: number): Promise<void> {
    const session = await this.getSession(sessionId);
    session.lastPresentationStepNumber = stepNumber;

    const { ok, error } = await this.storageClient.uploadFromText(
      `session-${sessionId}.json`,
      JSON.stringify(session)
    );

    if (!ok || error) {
      throw new Error('Failed to update last step');
    }
  }
}