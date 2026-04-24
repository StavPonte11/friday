import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { getServerSession } from '../auth/session';
import { requireAuth, requireRole } from '../auth/guards';

export const createContext = async () => {
    const session = await getServerSession();
    return { session };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

export const t = initTRPC.context<Context>().create({
    transformer: superjson,
});

export const router = t.router;

// Basic in-memory rate limiter
const rateLimitCache = new Map<string, { count: number, resetAt: number }>();

const rateLimiter = t.middleware(({ ctx, next }) => {
    // In production, derive key from ctx.session.user.id or req.headers['x-forwarded-for']
    const key = ctx?.session?.user?.id || 'anonymous';
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

const isAuthed = t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({
        ctx: {
            ...ctx,
            session: ctx.session,
        },
    });
});

const isAdmin = t.middleware(({ ctx, next }) => {
    if (!ctx.session?.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    requireRole(ctx.session.user, "ADMIN");
    return next({
        ctx: {
            ...ctx,
            session: ctx.session,
        },
    });
});

export const publicProcedure = t.procedure.use(rateLimiter);
export const protectedProcedure = t.procedure.use(rateLimiter).use(isAuthed);
export const adminProcedure = t.procedure.use(rateLimiter).use(isAdmin);
