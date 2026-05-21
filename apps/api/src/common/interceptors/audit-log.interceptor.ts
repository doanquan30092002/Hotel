import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';

import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayloadUser } from '../decorators/current-user.decorator';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function extractEntity(url: string): string {
  // /api/v1/users/123  -> "user"
  // /api/v1/settings   -> "setting"
  const parts = url.split('?')[0]?.split('/').filter(Boolean) ?? [];
  // parts: ["api", "v1", "<resource>", ...]
  const resource = parts[2];
  if (!resource) return 'unknown';
  // Singularise naively (strip trailing 's' if present)
  return resource.endsWith('s') ? resource.slice(0, -1) : resource;
}

function extractEntityId(url: string): string {
  const parts = url.split('?')[0]?.split('/').filter(Boolean) ?? [];
  // parts[3] is the id segment if present
  return parts[3] ?? '';
}

function resolveAction(method: string): string {
  switch (method) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return method.toLowerCase();
  }
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayloadUser }>();
    const { method, url, body } = request;

    if (!MUTATION_METHODS.has(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const entity = extractEntity(url);
        const entityId = extractEntityId(url);
        const userId = request.user?.id ?? null;
        const action = resolveAction(method);

        // Best-effort: skip silently if entity or entityId cannot be determined
        if (!entity || entity === 'unknown') return;

        this.prisma.auditLog
          .create({
            data: {
              userId,
              action,
              entity,
              entityId: entityId || 'n/a',
              // Prisma Json field: cast to Prisma.InputJsonValue via unknown
              payload: (body ?? undefined) as Prisma.InputJsonValue | undefined,
            },
          })
          .catch((err: unknown) => {
            this.logger.warn(`AuditLog write failed: ${String(err)}`);
          });
      }),
    );
  }
}
