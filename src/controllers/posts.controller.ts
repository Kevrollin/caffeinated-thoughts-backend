import { Request, Response } from 'express';
import { prisma } from '../services/prisma.js';
import { z } from 'zod';

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  cursor: z.string().optional(),
});

const upsertSchema = z.object({
  title: z.string().min(3),
  contentMarkdown: z.string().min(1),
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  featuredImageUrl: z.string().optional().refine(val => {
    if (!val || val === '') return true;
    // Allow relative paths starting with /assets/
    if (val.startsWith('/assets/')) return true;
    // Allow full URLs
    return z.string().url().safeParse(val).success;
  }, {
    message: "Invalid URL - must be a full URL or a path starting with /assets/"
  }),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

export const PostsController = {
  list: async (req: Request, res: Response) => {
    try {
      const { limit, cursor } = paginationSchema.parse(req.query);
      const isAdmin = req.path.startsWith('/admin');
      
      const posts = await prisma.post.findMany({
        where: isAdmin ? {} : { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImageUrl: true,
          tags: true,
          category: true,
          status: isAdmin ? true : false,
          publishedAt: true,
          createdAt: true,
        },
      });
      let nextCursor: string | undefined;
      if (posts.length > limit) {
        const next = posts.pop();
        nextCursor = next?.id;
      }
      return res.json({ posts, nextCursor });
    } catch (error) {
      console.error('Posts list error:', error);
      return res.status(500).json({ error: { message: 'Failed to fetch posts', code: 'INTERNAL_ERROR' } });
    }
  },

  getBySlug: async (req: Request, res: Response) => {
    const { slug } = req.params;
    const post = await prisma.post.findUnique({ where: { slug } });
    if (!post) return res.status(404).json({ error: { message: 'Post not found', code: 'NOT_FOUND' } });
    return res.json({ post });
  },

  getById: async (req: Request, res: Response) => {
    const { id } = req.params;
    const post = await prisma.post.findUnique({ 
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    if (!post) return res.status(404).json({ error: { message: 'Post not found', code: 'NOT_FOUND' } });
    return res.json({ post });
  },

  create: async (req: Request, res: Response) => {
    const body = upsertSchema.parse(req.body);
    const slugBase = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;
    const post = await prisma.post.create({
      data: {
        ...body,
        featuredImageUrl: body.featuredImageUrl === '' ? null : body.featuredImageUrl,
        slug,
        authorId: res.locals.userId,
        publishedAt: body.status === 'PUBLISHED' ? new Date() : null,
      },
    });
    return res.status(201).json({ post });
  },

  update: async (req: Request, res: Response) => {
    const { id } = req.params;
    const body = upsertSchema.partial().parse(req.body);
    const post = await prisma.post.update({
      where: { id },
      data: {
        ...body,
        featuredImageUrl: body.featuredImageUrl === '' ? null : body.featuredImageUrl,
        publishedAt: body.status === 'PUBLISHED' ? new Date() : undefined,
      },
    });
    return res.json({ post });
  },

  remove: async (req: Request, res: Response) => {
    const { id } = req.params;
    await prisma.post.delete({ where: { id } });
    return res.status(204).send();
  },
};


