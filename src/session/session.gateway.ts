// src/session/session.gateway.ts
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  path: '/socket'
})
export class SessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;
  private readonly logger = new Logger(SessionGateway.name);
  private sessions = new Map<string, WebSocket>();
  private pendingResponses = new Map<string, (response: any) => void>();

  handleConnection(client: WebSocket, request: Request) {
    const threadId = new URL(request.url, 'http://localhost').searchParams.get('threadId');
    if (threadId) {
      this.sessions.set(threadId, client);
      this.logger.log(`Client connected with threadId: ${threadId}`);
    }
  }

  handleDisconnect(client: WebSocket) {
    for (const [threadId, socket] of this.sessions.entries()) {
      if (socket === client) {
        this.sessions.delete(threadId);
        this.logger.log(`Client disconnected: ${threadId}`);
        break;
      }
    }
  }

  sendToClient(threadId: string, message: any) {
    const client = this.sessions.get(threadId);
    if (client?.readyState === WebSocket.OPEN) {
      this.logger.log('Sending message to client: ' + JSON.stringify(message))
      client.send(JSON.stringify(message));
    }
  }

  addPendingResponse(toolCallId: string, resolver: (response: any) => void) {
    this.pendingResponses.set(toolCallId, resolver);
  }

  handleClientResponse(toolCallId: string, response: any) {
    const resolver = this.pendingResponses.get(toolCallId);
    if (resolver) {
      resolver(response);
      this.pendingResponses.delete(toolCallId);
    }
  }

  // Add this helper method to your SessionGateway class
  removePendingResponse(toolCallId: string): void {
    this.pendingResponses.delete(toolCallId);
  }
}