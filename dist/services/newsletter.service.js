import { prisma } from './prisma.js';
export class NewsletterService {
    // Send newsletter email to a single subscriber
    static async sendNewsletterEmail(subscriberEmail, articleData) {
        try {
            const emailData = {
                to_email: subscriberEmail,
                subject: `☕ Fresh Brew: ${articleData.title}`,
                article_title: articleData.title,
                article_excerpt: articleData.excerpt || '',
                article_content: this.truncateContent(articleData.content, 200),
                article_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/post/${articleData.slug}`,
                site_name: 'Caffeinated Thoughts',
                unsubscribe_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/unsubscribe?email=${encodeURIComponent(subscriberEmail)}`
            };
            // For now, we'll use a simple fetch to EmailJS
            // In production, you might want to use a more robust email service
            const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    service_id: this.EMAILJS_SERVICE_ID,
                    template_id: this.EMAILJS_TEMPLATE_ID,
                    user_id: this.EMAILJS_PUBLIC_KEY,
                    template_params: emailData
                })
            });
            return response.ok;
        }
        catch (error) {
            console.error('Error sending newsletter email:', error);
            return false;
        }
    }
    // Send newsletter to all active subscribers
    static async sendNewsletterToAllSubscribers(articleData) {
        try {
            // Get all active subscribers
            const subscribers = await prisma.newsletterSubscription.findMany({
                where: { isActive: true },
                select: { email: true }
            });
            let sent = 0;
            let failed = 0;
            // Send emails in batches to avoid overwhelming the email service
            const batchSize = 10;
            for (let i = 0; i < subscribers.length; i += batchSize) {
                const batch = subscribers.slice(i, i + batchSize);
                const promises = batch.map(async (subscriber) => {
                    const success = await this.sendNewsletterEmail(subscriber.email, articleData);
                    if (success) {
                        sent++;
                    }
                    else {
                        failed++;
                    }
                });
                await Promise.all(promises);
                // Add a small delay between batches
                if (i + batchSize < subscribers.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            return {
                sent,
                failed,
                total: subscribers.length
            };
        }
        catch (error) {
            console.error('Error sending newsletter to all subscribers:', error);
            throw error;
        }
    }
    // Truncate content for email preview
    static truncateContent(content, maxLength) {
        // Remove markdown formatting for email preview
        const plainText = content
            .replace(/#{1,6}\s+/g, '') // Remove headers
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1') // Remove italic
            .replace(/`(.*?)`/g, '$1') // Remove code
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
            .replace(/\n+/g, ' ') // Replace newlines with spaces
            .trim();
        if (plainText.length <= maxLength) {
            return plainText;
        }
        return plainText.substring(0, maxLength) + '...';
    }
    // Get subscriber count
    static async getSubscriberCount() {
        try {
            return await prisma.newsletterSubscription.count({
                where: { isActive: true }
            });
        }
        catch (error) {
            console.error('Error getting subscriber count:', error);
            return 0;
        }
    }
}
NewsletterService.EMAILJS_SERVICE_ID = 'service_2vgncdt';
NewsletterService.EMAILJS_TEMPLATE_ID = 'template_0dy8fwz';
NewsletterService.EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || '';
