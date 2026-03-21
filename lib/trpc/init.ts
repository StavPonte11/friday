import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';

export const t = initTRPC.create({
    transformer: superjson,
});

export const router = t.router;

// Basic in-memory rate limiter
const rateLimitCache = new Map<string, { count: number, resetAt: number }>();

const rateLimiter = t.middleware(({ ctx, next }) => {
    // In production, derive key from ctx.session.user.id or req.headers['x-forwarded-for']
    const key = (ctx as any)?.session?.user?.id || 'anonymous';
    const limit = 200; // 200 requests per minute
    const windowMs = 60 * 1000;
    
    const now = Date.now();
    const record = rateLimitCache.get(key) || { count: 0, resetAt: now + windowMs };
    
    if (now > record.resetAt) {
        record.count = 1;
        record.resetAt = now + windowMs;
    } else {
        record.count++;
    }
    
    rateLimitCache.set(key, record);
    
    if (record.count > limit) {
        throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Rate limit exceeded. Please try again later.'
        });
    }
    
    return next({ ctx });
});

export const publicProcedure = t.procedure.use(rateLimiter);
