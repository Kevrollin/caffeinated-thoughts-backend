import { Request, Response } from 'express';
import { prisma } from '../services/prisma.js';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const unsubscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const NewsletterController = {
  // Subscribe to newsletter
  subscribe: async (req: Request, res: Response) => {
    try {
      const { email } = subscribeSchema.parse(req.body);
      
      // Check if email already exists
      const existingSubscription = await prisma.newsletterSubscription.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingSubscription) {
        if (existingSubscription.isActive) {
          return res.status(400).json({ 
            error: { 
              message: 'Email is already subscribed to the newsletter', 
              code: 'ALREADY_SUBSCRIBED' 
            } 
          });
        } else {
          // Reactivate subscription
          await prisma.newsletterSubscription.update({
            where: { email: email.toLowerCase() },
            data: { 
              isActive: true,
              unsubscribedAt: null,
              updatedAt: new Date()
            }
          });
          
          return res.json({ 
            success: true, 
            message: 'Successfully resubscribed to newsletter' 
          });
        }
      }

      // Create new subscription
      await prisma.newsletterSubscription.create({
        data: {
          email: email.toLowerCase(),
          isActive: true
        }
      });

      return res.json({ 
        success: true, 
        message: 'Successfully subscribed to newsletter' 
      });
    } catch (error: any) {
      console.error('Newsletter subscription error:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: { 
            message: error.errors[0].message, 
            code: 'VALIDATION_ERROR' 
          } 
        });
      }
      
      return res.status(500).json({ 
        error: { 
          message: 'Failed to subscribe to newsletter', 
          code: 'INTERNAL_ERROR' 
        } 
      });
    }
  },

  // Unsubscribe from newsletter
  unsubscribe: async (req: Request, res: Response) => {
    try {
      const { email } = unsubscribeSchema.parse(req.body);
      
      const subscription = await prisma.newsletterSubscription.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!subscription) {
        return res.status(404).json({ 
          error: { 
            message: 'Email not found in newsletter subscriptions', 
            code: 'NOT_FOUND' 
          } 
        });
      }

      if (!subscription.isActive) {
        return res.status(400).json({ 
          error: { 
            message: 'Email is already unsubscribed', 
            code: 'ALREADY_UNSUBSCRIBED' 
          } 
        });
      }

      // Deactivate subscription
      await prisma.newsletterSubscription.update({
        where: { email: email.toLowerCase() },
        data: { 
          isActive: false,
          unsubscribedAt: new Date(),
          updatedAt: new Date()
        }
      });

      return res.json({ 
        success: true, 
        message: 'Successfully unsubscribed from newsletter' 
      });
    } catch (error: any) {
      console.error('Newsletter unsubscribe error:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: { 
            message: error.errors[0].message, 
            code: 'VALIDATION_ERROR' 
          } 
        });
      }
      
      return res.status(500).json({ 
        error: { 
          message: 'Failed to unsubscribe from newsletter', 
          code: 'INTERNAL_ERROR' 
        } 
      });
    }
  },

  // Get all active subscribers (admin only)
  getSubscribers: async (req: Request, res: Response) => {
    try {
      const subscribers = await prisma.newsletterSubscription.findMany({
        where: { isActive: true },
        select: {
          id: true,
          email: true,
          subscribedAt: true,
          createdAt: true
        },
        orderBy: { subscribedAt: 'desc' }
      });

      return res.json({ 
        success: true, 
        subscribers,
        count: subscribers.length
      });
    } catch (error: any) {
      console.error('Get subscribers error:', error);
      return res.status(500).json({ 
        error: { 
          message: 'Failed to fetch subscribers', 
          code: 'INTERNAL_ERROR' 
        } 
      });
    }
  },

  // Get subscription status
  getStatus: async (req: Request, res: Response) => {
    try {
      const { email } = req.query;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ 
          error: { 
            message: 'Email parameter is required', 
            code: 'VALIDATION_ERROR' 
          } 
        });
      }

      const subscription = await prisma.newsletterSubscription.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          isActive: true,
          subscribedAt: true,
          unsubscribedAt: true
        }
      });

      return res.json({ 
        success: true, 
        isSubscribed: subscription?.isActive || false,
        subscription: subscription || null
      });
    } catch (error: any) {
      console.error('Get subscription status error:', error);
      return res.status(500).json({ 
        error: { 
          message: 'Failed to check subscription status', 
          code: 'INTERNAL_ERROR' 
        } 
      });
    }
  }
};
