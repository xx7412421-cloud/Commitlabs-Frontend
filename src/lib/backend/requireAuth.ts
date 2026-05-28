import { NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/backend/auth';
import { UnauthorizedError, ForbiddenError } from '@/lib/backend/errors';

const ADMIN_ADDRESSES = new Set(
    process.env.ADMIN_ADDRESSES?.split(',').map(a => a.trim()).filter(Boolean) ?? []
);

export interface AuthenticatedRequest {
    address: string;
    isAdmin: boolean;
}

export function verifyAuth(req: NextRequest): AuthenticatedRequest {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedError('Bearer token required');
    }

    const token = authHeader.slice(7);
    const session = verifySessionToken(token);

    if (!session.valid || !session.address) {
        throw new UnauthorizedError('Invalid or expired session');
    }

    return {
        address: session.address,
        isAdmin: ADMIN_ADDRESSES.has(session.address),
    };
}

export function requireAdmin(req: NextRequest): AuthenticatedRequest {
    const auth = verifyAuth(req);

    if (!auth.isAdmin) {
        throw new ForbiddenError('Admin access required');
    }

    return auth;
}
