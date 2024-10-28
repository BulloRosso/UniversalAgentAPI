// src/session/session.module.ts
import { Module } from '@nestjs/common';
import { SessionGateway } from './session.gateway';

@Module({
  providers: [SessionGateway],
  exports: [SessionGateway]  // Export SessionGateway so it can be used in other modules
})
export class SessionModule {}