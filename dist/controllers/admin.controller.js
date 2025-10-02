import { prisma } from '../services/prisma.js';
export const AdminController = {
    stats: async (_req, res) => {
        try {
            const [postsCount, transactionsCount, revenueSum] = await Promise.all([
                prisma.post.count({ where: { status: 'PUBLISHED' } }),
                prisma.transaction.count({ where: { status: 'SUCCESS' } }),
                prisma.transaction.aggregate({
                    where: { status: 'SUCCESS' },
                    _sum: { amount: true },
                }),
            ]);
            return res.json({
                posts: postsCount,
                coffees: transactionsCount,
                revenue: revenueSum._sum.amount || 0,
            });
        }
        catch (error) {
            console.error('Stats error:', error);
            return res.status(500).json({ error: { message: 'Failed to fetch stats', code: 'INTERNAL_ERROR' } });
        }
    },
    transactions: async (req, res) => {
        try {
            const limit = Math.min(Number(req.query.limit) || 20, 100);
            const offset = Number(req.query.offset) || 0;
            const transactions = await prisma.transaction.findMany({
                take: limit,
                skip: offset,
                orderBy: { createdAt: 'desc' },
                include: {
                    post: {
                        select: { id: true, title: true, slug: true }
                    }
                }
            });
            const total = await prisma.transaction.count();
            return res.json({
                transactions,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + limit < total
                }
            });
        }
        catch (error) {
            console.error('Transactions error:', error);
            return res.status(500).json({ error: { message: 'Failed to fetch transactions', code: 'INTERNAL_ERROR' } });
        }
    },
};
