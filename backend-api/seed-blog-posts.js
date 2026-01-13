// Seed script to populate blog posts from mock data
const mockBlogPosts = [
  {
    title: 'My Journey in Hip Hop: From the Streets to the Studio',
    slug: 'my-journey-in-hip-hop',
    excerpt: 'Reflecting on my path to becoming a rapper and the lessons learned along the way...',
    content: `## The Beginning\n\nIt all started when I was just a kid in the neighborhood. Music was my escape, my therapy, and eventually, my purpose.\n\n### Finding My Voice\n\nThe first time I stepped into a studio, I was nervous. But the moment the beat dropped, everything changed...\n\n## Breaking Through\n\nSuccess didn't come overnight. It took years of grinding, writing bars at 3 AM, and believing in myself when no one else did.\n\n### The Lessons\n\n1. Stay authentic to your story\n2. Never stop learning and evolving\n3. Surround yourself with real ones\n4. Give back to your community\n\n---\n\nThis is just the beginning. More stories to come.`,
    coverImage: 'https://images.genius.com/7ccf396977c32fe34ff8ccccce2bb0c6.1000x563x1.jpg',
    authorId: '1',
    authorName: 'Kendrick Lamar',
    tags: ['Journey', 'Hip Hop', 'Personal', 'Music'],
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 1243,
    likeCount: 87,
    commentCount: 23,
  },
  {
    title: 'Behind the Lyrics: Breaking Down My Latest Track',
    slug: 'behind-the-lyrics-latest-track',
    excerpt: 'An in-depth look at the creative process and meaning behind my new single...',
    content: `## The Inspiration\n\nThis track came from a real place. I wanted to capture the feeling of triumph after overcoming obstacles.\n\n### The Writing Process\n\nI wrote the first verse in one sitting. The words just flowed naturally, like they were meant to be written at that exact moment.\n\n## Production Notes\n\nWorked with an amazing producer who understood the vision perfectly. The beat has this raw energy that complements the lyrics.\n\n### The Message\n\nAt its core, this song is about resilience and never giving up on your dreams, no matter how impossible they might seem.`,
    coverImage: 'https://images.genius.com/3a1c4a9403e6935e4cfba735d55306ca.1000x563x1.jpg',
    authorId: '2',
    authorName: 'J. Cole',
    tags: ['Lyrics', 'Behind the Scenes', 'Music', 'Creative Process'],
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 892,
    likeCount: 64,
    commentCount: 18,
  },
  {
    title: 'The Art of Storytelling in Rap',
    slug: 'art-of-storytelling-rap',
    excerpt: 'Why narrative matters in hip hop and how to craft compelling stories through bars...',
    content: `## Storytelling is Everything\n\nThe best rappers are the best storytellers. They transport you to different worlds, make you feel emotions, and leave you thinking long after the song ends.\n\n### Elements of a Great Story\n\n- **Setting the scene**: Paint a vivid picture with your words\n- **Building tension**: Create stakes and conflict\n- **Character development**: Make listeners care about the people in your story\n- **Payoff**: Deliver a satisfying conclusion\n\n## Examples from the Greats\n\nLet me break down some classic storytelling tracks and what makes them unforgettable:\n\n### Slick Rick - "Children's Story"\nMaster class in narrative structure and delivery.\n\n### Nas - "Rewind"\nTelling a story backwards - pure genius.\n\n### Kendrick Lamar - "Sing About Me"\nEmotional depth and multiple perspectives.\n\n---\n\n*Remember: Your story is unique. Tell it with conviction.*`,
    coverImage: 'https://images.genius.com/eb9ee3c5f2e259748d6fd897c2ff7a71.1000x563x1.jpg',
    authorId: '3',
    authorName: 'Nas',
    tags: ['Rap', 'Writing', 'Storytelling', 'Tips'],
    publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    viewCount: 1567,
    likeCount: 112,
    commentCount: 31,
  },
];

async function seedBlogPosts() {
  try {
    const response = await fetch('http://localhost:3000/api/blog-posts/seed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ posts: mockBlogPosts }),
    });

    const data = await response.json();
    console.log('✅ Seed successful:', data);
  } catch (error) {
    console.error('❌ Seed failed:', error);
  }
}

seedBlogPosts();
