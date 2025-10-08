import { prisma } from '../services/prisma.js';
import { z } from 'zod';
const paginationSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(10),
    cursor: z.string().optional(),
});
const upsertSchema = z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});
export const ThreadsController = {
    list: async (req, res) => {
        const { limit, cursor } = paginationSchema.parse(req.query);
        const threads = await prisma.thread.findMany({
            take: limit + 1,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: { id: true, name: true, email: true }
                },
                posts: {
                    select: { id: true, title: true, slug: true, orderInThread: true, status: true }
                },
                _count: {
                    select: { posts: true }
                }
            }
        });
        const hasNextPage = threads.length > limit;
        const nextCursor = hasNextPage ? threads[limit - 1].id : null;
        const data = hasNextPage ? threads.slice(0, -1) : threads;
        return res.json({
            threads: data,
            pagination: {
                hasNextPage,
                nextCursor
            }
        });
    },
    getBySlug: async (req, res) => {
        const { slug } = req.params;
        const thread = await prisma.thread.findUnique({
            where: { slug },
            include: {
                author: {
                    select: { id: true, name: true, email: true }
                },
                posts: {
                    where: { status: 'PUBLISHED' },
                    orderBy: { orderInThread: 'asc' },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        excerpt: true,
                        featuredImageUrl: true,
                        orderInThread: true,
                        publishedAt: true,
                        createdAt: true
                    }
                },
                _count: {
                    select: { posts: true }
                }
            }
        });
        if (!thread) {
            return res.status(404).json({ message: 'Thread not found' });
        }
        return res.json({ thread });
    },
    getById: async (req, res) => {
        const { id } = req.params;
        const thread = await prisma.thread.findUnique({
            where: { id },
            include: {
                author: {
                    select: { id: true, name: true, email: true }
                },
                posts: {
                    orderBy: { orderInThread: 'asc' },
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        orderInThread: true,
                        status: true
                    }
                },
                _count: {
                    select: { posts: true }
                }
            }
        });
        if (!thread) {
            return res.status(404).json({ message: 'Thread not found' });
        }
        return res.json({ thread });
    },
    create: async (req, res) => {
        const body = upsertSchema.parse(req.body);
        const slugBase = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const slug = `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;
        const thread = await prisma.thread.create({
            data: {
                ...body,
                slug,
                authorId: res.locals.userId,
            },
            include: {
                author: {
                    select: { id: true, name: true, email: true }
                },
                _count: {
                    select: { posts: true }
                }
            }
        });
        return res.status(201).json({ thread });
    },
    update: async (req, res) => {
        const { id } = req.params;
        const body = upsertSchema.partial().parse(req.body);
        const thread = await prisma.thread.update({
            where: { id },
            data: body,
            include: {
                author: {
                    select: { id: true, name: true, email: true }
                },
                _count: {
                    select: { posts: true }
                }
            }
        });
        return res.json({ thread });
    },
    remove: async (req, res) => {
        const { id } = req.params;
        // First, remove all posts in the thread
        await prisma.post.deleteMany({
            where: { threadId: id }
        });
        // Then delete the thread
        await prisma.thread.delete({ where: { id } });
        return res.status(204).send();
    },
    addPost: async (req, res) => {
        const { id } = req.params;
        const { postId } = req.body;
        // Get the current max order in the thread
        const maxOrder = await prisma.post.findFirst({
            where: { threadId: id },
            orderBy: { orderInThread: 'desc' },
            select: { orderInThread: true }
        });
        const nextOrder = (maxOrder?.orderInThread || 0) + 1;
        // Update the post to be part of the thread
        const post = await prisma.post.update({
            where: { id: postId },
            data: {
                threadId: id,
                orderInThread: nextOrder
            },
            include: {
                author: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
        return res.json({ post });
    },
    removePost: async (req, res) => {
        const { id } = req.params;
        const { postId } = req.body;
        // Remove the post from the thread
        const post = await prisma.post.update({
            where: { id: postId },
            data: {
                threadId: null,
                orderInThread: null
            },
            include: {
                author: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
        return res.json({ post });
    },
    reorderPosts: async (req, res) => {
        const { id } = req.params;
        const { postIds } = req.body; // Array of post IDs in new order
        // Update the order of posts in the thread
        const updates = postIds.map((postId, index) => prisma.post.update({
            where: { id: postId },
            data: { orderInThread: index + 1 }
        }));
        await Promise.all(updates);
        return res.json({ message: 'Posts reordered successfully' });
    }
};
