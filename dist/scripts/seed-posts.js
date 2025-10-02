import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    // Find the admin user
    const admin = await prisma.user.findUnique({
        where: { email: 'kelvinmukaria2023@gmail.com' }
    });
    if (!admin) {
        console.log('Admin user not found. Please run the main seed script first.');
        return;
    }
    // Check if posts already exist
    const existingPosts = await prisma.post.count();
    if (existingPosts > 0) {
        console.log('Posts already exist, skipping...');
        return;
    }
    // Create sample posts
    const samplePosts = [
        {
            title: 'Welcome to Caffeinated Thoughts',
            slug: 'welcome-to-caffeinated-thoughts',
            contentMarkdown: `# Welcome to Caffeinated Thoughts

This is your first post on the Caffeinated Thoughts blog platform. Here you can share your coffee-fueled ideas and insights.

## Features

- **Markdown Support**: Write your posts in Markdown
- **Coffee Payments**: Readers can buy you coffee via M-Pesa
- **Admin Dashboard**: Manage your posts and view analytics
- **Responsive Design**: Works great on all devices

## Getting Started

1. Create your first post
2. Share it with the world
3. Let readers support you with coffee!

*Happy blogging!* ☕`,
            excerpt: 'Your first cup of coffee-fueled content is brewing...',
            tags: ['welcome', 'coffee', 'getting-started'],
            category: 'general',
            status: 'PUBLISHED',
            publishedAt: new Date(),
            authorId: admin.id,
        },
        {
            title: 'The Art of Coffee Making',
            slug: 'the-art-of-coffee-making',
            contentMarkdown: `# The Art of Coffee Making

Coffee is more than just a beverage—it's an art form. From bean selection to the perfect pour, every step matters.

## The Perfect Cup

### 1. Quality Beans
Start with freshly roasted, high-quality beans. The origin and roast level will determine your final cup's character.

### 2. Proper Grinding
Grind your beans just before brewing. The grind size should match your brewing method:
- **Espresso**: Fine grind
- **Pour-over**: Medium-fine grind
- **French Press**: Coarse grind

### 3. Water Temperature
The ideal water temperature is between 195°F and 205°F (90°C to 96°C). Too hot, and you'll extract bitter compounds; too cool, and you'll miss the nuanced flavors.

### 4. Brewing Time
Timing is crucial. Each method has its optimal brewing time:
- **Espresso**: 25-30 seconds
- **Pour-over**: 2-4 minutes
- **French Press**: 4-5 minutes

## Pro Tips

- Use filtered water for the best taste
- Store beans in an airtight container away from light
- Clean your equipment regularly
- Experiment with different ratios

*Remember: the best coffee is the one you enjoy most!* ☕`,
            excerpt: 'Discover the secrets behind the perfect cup of coffee.',
            tags: ['coffee', 'tutorial', 'brewing'],
            category: 'tutorials',
            status: 'PUBLISHED',
            publishedAt: new Date(),
            authorId: admin.id,
        },
        {
            title: 'Morning Rituals for Productivity',
            slug: 'morning-rituals-for-productivity',
            contentMarkdown: `# Morning Rituals for Productivity

How you start your morning sets the tone for your entire day. Here's how to create a morning routine that fuels both your body and mind.

## The Power of Morning Routines

A well-designed morning routine can:
- Increase your energy levels
- Improve focus and concentration
- Reduce stress and anxiety
- Set positive intentions for the day

## Building Your Morning Ritual

### 1. Wake Up Early
Give yourself time to ease into the day. Even 30 minutes of extra time can make a significant difference.

### 2. Hydrate First
Start with a glass of water to rehydrate after a night's sleep. Your body needs it!

### 3. Mindful Coffee Time
Instead of rushing through your coffee, make it a mindful moment:
- Savor the aroma
- Notice the taste
- Use it as a moment of gratitude

### 4. Light Movement
Even 5-10 minutes of stretching or a short walk can energize your body and mind.

### 5. Set Daily Intentions
Take a moment to think about your goals for the day. What do you want to accomplish?

## Sample Morning Routine

1. **6:00 AM**: Wake up, drink water
2. **6:05 AM**: Light stretching or yoga
3. **6:15 AM**: Mindful coffee preparation and consumption
4. **6:30 AM**: Review daily goals and priorities
5. **6:45 AM**: Begin work or start your day

*Remember: consistency is key. Start small and build your routine gradually.* ☕`,
            excerpt: 'How starting your day with coffee can transform your productivity.',
            tags: ['productivity', 'morning', 'routine', 'wellness'],
            category: 'lifestyle',
            status: 'PUBLISHED',
            publishedAt: new Date(),
            authorId: admin.id,
        },
        {
            title: 'Coffee Culture Around the World',
            slug: 'coffee-culture-around-the-world',
            contentMarkdown: `# Coffee Culture Around the World

Coffee is a universal language, but every culture has its own unique way of enjoying this beloved beverage.

## Italy: The Birthplace of Espresso

In Italy, coffee is a way of life. The traditional Italian coffee culture emphasizes:
- **Espresso**: The foundation of Italian coffee culture
- **Quick consumption**: Coffee is meant to be enjoyed standing at the bar
- **No milk after 11 AM**: Cappuccinos are strictly morning drinks

## Ethiopia: The Origin of Coffee

Ethiopia is where coffee was first discovered. The traditional coffee ceremony is a social ritual that can last hours:
- Green beans are roasted over an open flame
- The aroma is shared with guests
- Three rounds of coffee are served, each with different meanings

## Japan: Precision and Artistry

Japanese coffee culture is known for its precision and attention to detail:
- **Pour-over methods**: Meticulously crafted single cups
- **Coffee shops**: Often quiet spaces for contemplation
- **Seasonal variations**: Coffee menus change with the seasons

## Australia: The Flat White Revolution

Australia has given the world the flat white and a unique coffee culture:
- **High-quality standards**: Australians expect excellent coffee
- **All-day consumption**: Coffee is enjoyed throughout the day
- **Casual atmosphere**: Coffee shops are social hubs

## Turkey: Traditional Preparation

Turkish coffee is prepared using a unique method:
- Finely ground beans boiled in a cezve
- Served with the grounds still in the cup
- Fortune telling from the coffee grounds is a popular tradition

*Each culture's approach to coffee reflects its values and lifestyle. What's your favorite coffee tradition?* ☕`,
            excerpt: 'Explore how different cultures around the world enjoy their coffee.',
            tags: ['coffee', 'culture', 'travel', 'traditions'],
            category: 'culture',
            status: 'PUBLISHED',
            publishedAt: new Date(),
            authorId: admin.id,
        }
    ];
    for (const postData of samplePosts) {
        await prisma.post.create({
            data: postData,
        });
    }
    console.log(`Created ${samplePosts.length} sample posts`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
