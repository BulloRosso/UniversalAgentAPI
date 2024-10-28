// src/adapters/custom-ws.adapter.ts
import { WebSocketAdapter, INestApplication } from '@nestjs/common';
import { MessageMappingProperties } from '@nestjs/websockets';
import { Observable, fromEvent, EMPTY } from 'rxjs';
import { mergeMap, filter } from 'rxjs/operators';
import { Server, WebSocket, ServerOptions } from 'ws';

export class CustomWebSocketAdapter implements WebSocketAdapter {
  constructor(private app: INestApplication) {}

  create(port: number, options: ServerOptions = {}): Server {
    return new Server({
      ...options,
      port,
    });
  }

  // Fixed the callback type to match WebSocket.Server expectations
  bindClientConnect(server: Server, callback: (client: WebSocket) => void): void {
    server.on('connection', (client: WebSocket) => {
      callback(client);
    });
  }

  bindMessageHandlers(
    client: WebSocket,
    handlers: MessageMappingProperties[],
    process: (data: any) => Observable<any>,
  ): void {
    fromEvent(client, 'message')
      .pipe(
        mergeMap(data => {
          let message;
          try {
            message = JSON.parse((data as { data: string }).data);
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
            return EMPTY;
          }

          const messageHandler = handlers.find(
            handler => handler.message === message.event,
          );
          if (!messageHandler) {
            console.warn(`No handler found for message: ${message.event}`);
            return EMPTY;
          }
          return process(messageHandler.callback(message.data));
        }),
        filter(result => result !== null),
      )
      .subscribe(
        response => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(response));
          }
        },
        error => {
          console.error('WebSocket error:', error);
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ event: 'error', data: 'Internal server error' }));
          }
        },
      );
  }

  close(server: Server): void {
    server.close();
  }
}