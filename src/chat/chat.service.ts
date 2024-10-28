// src/chat/chat.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { SessionGateway } from '../session/session.gateway';

interface WebSocketFunctionArgs {
  type?: string;
  url?: string;
  [key: string]: any;
}

interface MessageContentText {
  type: 'text';
  text: {
    value: string;
    annotations: any[];
  };
}

interface MessageContentImage {
  type: 'image_file';
  image_file: {
    file_id: string;
  };
}

type MessageContent = MessageContentText | MessageContentImage;

@Injectable()
export class ChatService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(ChatService.name);
  private pollingIntervals = new Map<string, NodeJS.Timeout>();

  constructor(private readonly sessionGateway: SessionGateway) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async createThread() {
    this.logger.log('Creating a new thread...');
    const thread = await this.openai.beta.threads.create();
    if (!thread.id) {
      throw new Error('Failed to create thread: No thread ID returned');
    }
    return thread;
  }

  async addMessage(threadId: string, message: string) {
    if (!threadId || !message) {
      throw new BadRequestException('Thread ID and message are required');
    }

    return await this.openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
    });
  }

  async runAssistant(assistantId: string, threadId: string) {
    if (!assistantId || !threadId) {
      throw new BadRequestException('Assistant ID and Thread ID are required');
    }

    const run = await this.openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });

    if (['queued', 'in_progress', 'requires_action'].includes(run.status)) {
      this.startStatusPolling(run.id, threadId, assistantId);
    }

    return run;
  }

  private startStatusPolling(runId: string, threadId: string, assistantId: string) {
    const key = `${threadId}-${runId}`;

    if (this.pollingIntervals.has(key)) {
      clearInterval(this.pollingIntervals.get(key));
    }

    const interval = setInterval(async () => {
      try {
        await this.checkStatus(runId, threadId, assistantId);
      } catch (error) {
        this.logger.error(`Error in status polling: ${error.message}`);
        this.clearPollingInterval(threadId, runId);
      }
    }, 1000);

    this.pollingIntervals.set(key, interval);
  }

  private async checkStatus(runId: string, threadId: string, assistantId: string) {
    const run = await this.openai.beta.threads.runs.retrieve(threadId, runId);
    this.logger.log(`Run status is now ${run.status}`);

    if (run.status === 'completed') {
      this.clearPollingInterval(threadId, runId);
      await this.handleCompletedRun(threadId);
    } 
    else if (run.status === 'requires_action') {
      this.clearPollingInterval(threadId, runId);
      await this.handleRequiredAction(run, threadId, runId, assistantId);
    }
  }

  private async handleCompletedRun(threadId: string) {
    const messages = await this.openai.beta.threads.messages.list(threadId);

    if (messages.data[0]?.content?.length > 0) {
      const content = messages.data[0].content[0];

      if (content.type === 'text') {
        this.sessionGateway.sendToClient(threadId, {
          type: 'ASSISTANT_RESPONSE',
          message: content.text.value
        });
      } else if (content.type === 'image_file') {
        this.sessionGateway.sendToClient(threadId, {
          type: 'ASSISTANT_IMAGE',
          fileId: content.image_file.file_id
        });
      } else {
        this.logger.warn(`Unhandled content type: ${(content as any).type}`);
      }
    }
  }

  private async handleRequiredAction(run: any, threadId: string, runId: string, assistantId: string) {
    if (run.required_action?.type === 'submit_tool_outputs') {
      const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
      const toolOutputs = [];

      for (const toolCall of toolCalls) {
        if (toolCall.function.name.startsWith('ws_')) {
          try {
            const result = await this.executeWebSocketFunction(
              threadId,
              toolCall.function.name,
              JSON.parse(toolCall.function.arguments),
              toolCall.id
            );
            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: JSON.stringify(result)
            });
          } catch (error) {
            this.logger.error(`Error executing WebSocket function: ${error.message}`);
          }
        }
      }

      if (toolOutputs.length > 0) {
        await this.openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
          tool_outputs: toolOutputs
        });

        // Restart polling
        this.startStatusPolling(runId, threadId, assistantId);
      }
    }
  }

  private async executeWebSocketFunction(
    threadId: string, 
    functionName: string, 
    args: WebSocketFunctionArgs, 
    toolCallId: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket function execution timeout'));
      }, 180000);

      // Store the resolver function
      this.sessionGateway.addPendingResponse(toolCallId, (response: any) => {
        clearTimeout(timeout);
        resolve(response);
      });

      // Send command to client
      this.sessionGateway.sendToClient(threadId, {
        cmd: functionName.substring(3), // Remove 'ws_' prefix
        type: args.type || 'command',
        url: args.url || '',
        tool_call_id: toolCallId
      });
    });
  }

  private clearPollingInterval(threadId: string, runId: string) {
    const key = `${threadId}-${runId}`;
    if (this.pollingIntervals.has(key)) {
      clearInterval(this.pollingIntervals.get(key));
      this.pollingIntervals.delete(key);
    }
  }
}