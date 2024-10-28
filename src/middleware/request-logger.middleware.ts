// src/middleware/request-logger.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, body } = req;
    const userAgent = req.get('user-agent') || '';

    // Log the incoming request
    this.logger.debug(
      `[INCOMING REQUEST] ${method} ${originalUrl} - User Agent: ${userAgent}`,
    );
    if (Object.keys(body).length > 0) {
      this.logger.debug(`Request Body: ${JSON.stringify(body)}`);
    }

    // Track response
    res.on('finish', () => {
      const { statusCode } = res;
      this.logger.debug(
        `[RESPONSE] ${method} ${originalUrl} ${statusCode}`,
      );
    });

    next();
  }
}