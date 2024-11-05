// src/chat/chat.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import { SessionGateway } from '../session/session.gateway';

interface WebSocketFunctionArgs {
  type?: string;
  url?: string;
  data?: any;
  timeout?: number;
  [key: string]: any;
}

interface WebSocketResponse {
  status: 'success' | 'error';
  data?: any;
  error?: string;
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
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        if (functionName.startsWith('ui_')) {
          // Handle UI-specific tool calls
          await this.handleUIToolCall(threadId, functionName, args, toolCall.id);
          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: JSON.stringify({ status: 'ui_command_sent' })
          });
        } else if (functionName.startsWith('ws_')) {
          // Handle existing websocket tool calls
          try {
            const result = await this.executeWebSocketFunction(
              threadId,
              functionName,
              args,
              toolCall.id
            );
            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: JSON.stringify(result)
            });
          } catch (error) {
            this.logger.error(`Error executing WebSocket function: ${error.message}`);
          }
        } else {
          // Handle internal tool calls
          const result = await this.handleInternalToolCalls(functionName, args);
          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: JSON.stringify(result)
          });
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

  private async handleUIToolCall(
    threadId: string,
    functionName: string,
    args: any,
    toolCallId: string
  ): Promise<void> {
    this.logger.log(`Handling UI tool call: ${functionName} for thread ${threadId}`);

    // Verify threadId exists
    if (!threadId) {
      throw new BadRequestException('Thread ID is required for UI tool calls');
    }

    // Send UI-specific command to client
    this.sessionGateway.sendToClient(threadId, {
      cmd: functionName,
      ...args,
      tool_call_id: toolCallId
    });
  }

  private async handleInternalToolCalls(functionName: string, args: any): Promise<any> {
    this.logger.log(`Handling internal tool call: ${functionName}`);
    // Implement internal tool call handling logic here
    // Return the result of the tool call
    return { status: 'completed', result: 'internal_tool_executed' };
  }

  private clearPollingInterval(threadId: string, runId: string) {
    const key = `${threadId}-${runId}`;
    if (this.pollingIntervals.has(key)) {
      clearInterval(this.pollingIntervals.get(key));
      this.pollingIntervals.delete(key);
    }
  }

  private async executeWebSocketFunction(
    threadId: string,
    functionName: string,
    args: WebSocketFunctionArgs,
    toolCallId: string
  ): Promise<WebSocketResponse> {
    if (!threadId) {
      throw new BadRequestException('Thread ID is required for WebSocket functions');
    }

    return new Promise((resolve, reject) => {
      // Set timeout (default 3 minutes or use provided timeout)
      const timeoutDuration = args.timeout || 180000; // 3 minutes default
      const timeout = setTimeout(() => {
        this.sessionGateway.removePendingResponse(toolCallId);
        reject(new Error(`WebSocket function execution timeout after ${timeoutDuration}ms`));
      }, timeoutDuration);

      try {
        // Store the resolver function for this tool call
        this.sessionGateway.addPendingResponse(toolCallId, (response: any) => {
          clearTimeout(timeout);

          // Validate response
          if (!response) {
            resolve({ status: 'error', error: 'Empty response received' });
            return;
          }

          // Handle error responses
          if (response.error) {
            resolve({ status: 'error', error: response.error });
            return;
          }

          resolve({
            status: 'success',
            data: response
          });
        });

        // Prepare the command message
        const commandMessage = {
          cmd: functionName.replace(/^ws_/, ''), // Remove 'ws_' prefix
          type: args.type || 'command',
          thread_id: threadId,
          tool_call_id: toolCallId,
          ...args // Include any additional arguments
        };

        // Log the outgoing command
        this.logger.debug(`Sending WebSocket command: ${JSON.stringify(commandMessage)}`);

        // Send command to client
        this.sessionGateway.sendToClient(threadId, commandMessage);

      } catch (error) {
        clearTimeout(timeout);
        this.sessionGateway.removePendingResponse(toolCallId);
        reject(new Error(`Failed to execute WebSocket function: ${error.message}`));
      }
    });
  }

  
}