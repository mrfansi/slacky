import { PrismaClient } from '@prisma/client';

declare global {
    // allow global `var` declarations
    // eslint-disable-next-line no-unused-vars
    var prisma: PrismaClient | undefined;
}

/*
 * This pattern is to prevent multiple instances of Prisma Client in development
 * where Next.js has hot-reloading. In production, it's better to use a single instance.
 */
const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;