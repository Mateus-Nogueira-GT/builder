import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    // Rotas que requerem autenticação
    const protectedPaths = [
        '/admin',
        '/dashboard',
        '/onboarding',
        '/generate',
        '/hero-image',
        '/preview',
        '/publishing',
    ];

    const isProtected = protectedPaths.some((path) =>
        request.nextUrl.pathname.startsWith(path)
    );

    if (isProtected && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (request.nextUrl.pathname.startsWith('/admin') && token?.role !== 'super_admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/dashboard/:path*',
        '/onboarding/:path*',
        '/generate/:path*',
        '/hero-image/:path*',
        '/preview/:path*',
        '/publishing/:path*',
    ],
};
