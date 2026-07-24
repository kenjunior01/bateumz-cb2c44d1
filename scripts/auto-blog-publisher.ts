import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const openaiApiKey = process.env.OPENAI_API_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

interface NewsSource {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: { name: string };
}

interface BlogPostData {
  title: string;
  slug: string;
  content: string;
  summary: string;
  image_url: string;
  source_url: string;
  category_id: string;
  seo_keywords: string[];
  published_at: string;
}

// Fetch news from NewsAPI
async function fetchNews(keywords: string[]): Promise<NewsSource[]> {
  const newsApiKey = process.env.NEWS_API_KEY || "demo";
  const query = keywords.join(" OR ");

  try {
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=pt&pageSize=10&apiKey=${newsApiKey}`
    );
    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
}

// Generate SEO-friendly slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

// Extract keywords from content
function extractKeywords(content: string): string[] {
  const keywords = [
    "sorteios",
    "prêmios",
    "mundial 2026",
    "tecnologia",
    "inovação",
    "apostas",
    "concursos",
    "engajamento",
  ];

  const foundKeywords = keywords.filter((kw) =>
    content.toLowerCase().includes(kw)
  );

  return foundKeywords.slice(0, 5);
}

// Rewrite news with AI to be more human-like and SEO-optimized
async function rewriteNewsWithAI(
  originalTitle: string,
  originalContent: string,
  category: string
): Promise<{ title: string; content: string; summary: string }> {
  const prompt = `You are a professional content writer specializing in SEO-optimized blog posts for a lottery and giveaway platform called Bateumz.

Original news:
Title: ${originalTitle}
Content: ${originalContent}
Category: ${category}

Please rewrite this news as a human-friendly blog post that:
1. Has an engaging, SEO-friendly title (max 70 characters)
2. Includes 2-3 paragraphs of well-written content (300-400 words)
3. Incorporates relevant keywords naturally (sorteios, prêmios, concursos, etc.)
4. Maintains a friendly, conversational tone
5. Includes a brief summary (max 160 characters for meta description)
6. Adds a call-to-action encouraging readers to participate in Bateumz

Format your response as JSON with keys: title, content, summary`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const result = JSON.parse(
      response.choices[0].message.content || "{}"
    );
    return {
      title: result.title || originalTitle,
      content: result.content || originalContent,
      summary: result.summary || originalContent.slice(0, 160),
    };
  } catch (error) {
    console.error("Error rewriting with AI:", error);
    return {
      title: originalTitle,
      content: originalContent,
      summary: originalContent.slice(0, 160),
    };
  }
}

// Determine category based on content
function categorizeNews(
  title: string,
  content: string
): { id: string; name: string } {
  const categories = [
    { id: "sorteios-premios", name: "Sorteios & Prêmios" },
    { id: "mundial-2026", name: "Mundial 2026" },
    { id: "tecnologia-inovacao", name: "Tecnologia & Inovação" },
    { id: "dicas-estrategias", name: "Dicas & Estratégias" },
  ];

  const text = (title + " " + content).toLowerCase();

  if (
    text.includes("mundial") ||
    text.includes("copa") ||
    text.includes("futebol")
  ) {
    return categories[1];
  } else if (text.includes("tecnolog") || text.includes("inov")) {
    return categories[2];
  } else if (text.includes("dica") || text.includes("estratég")) {
    return categories[3];
  }

  return categories[0];
}

// Check if post already exists
async function postExists(slug: string): Promise<boolean> {
  const { data } = await supabase
    .from("blog_posts")
    .select("id")
    .eq("slug", slug)
    .single();

  return !!data;
}

// Create blog post
async function createBlogPost(post: BlogPostData): Promise<boolean> {
  try {
    // Get category ID from slug
    const { data: category } = await supabase
      .from("blog_categories")
      .select("id")
      .eq("slug", post.category_id)
      .single();

    if (!category) {
      console.error("Category not found:", post.category_id);
      return false;
    }

    const { error } = await supabase.from("blog_posts").insert({
      title: post.title,
      slug: post.slug,
      content: post.content,
      summary: post.summary,
      image_url: post.image_url,
      source_url: post.source_url,
      category_id: category.id,
      seo_keywords: post.seo_keywords,
      published_at: post.published_at,
      published: true,
      author_id: null, // System-generated
      region_id: null, // Global post
    });

    if (error) throw error;
    console.log(`✅ Blog post created: ${post.title}`);
    return true;
  } catch (error) {
    console.error("Error creating blog post:", error);
    return false;
  }
}

// Main automation function
async function publishBlogPosts() {
  console.log("🚀 Starting automated blog publishing...");

  const keywords = [
    "sorteios",
    "prêmios",
    "mundial 2026",
    "tecnologia",
    "inovação",
  ];

  try {
    // Fetch news
    console.log("📰 Fetching news...");
    const news = await fetchNews(keywords);

    if (news.length === 0) {
      console.log("No news found.");
      return;
    }

    console.log(`Found ${news.length} news articles`);

    // Process each news item
    for (const article of news.slice(0, 3)) {
      // Limit to 3 per run
      const slug = generateSlug(article.title);

      // Check if already exists
      if (await postExists(slug)) {
        console.log(`⏭️  Skipping (already exists): ${article.title}`);
        continue;
      }

      console.log(`✍️  Processing: ${article.title}`);

      // Categorize
      const category = categorizeNews(article.title, article.description);

      // Rewrite with AI
      const { title, content, summary } = await rewriteNewsWithAI(
        article.title,
        article.description,
        category.name
      );

      // Extract keywords
      const seoKeywords = extractKeywords(content);

      // Create blog post
      const blogPost: BlogPostData = {
        title,
        slug: generateSlug(title),
        content,
        summary,
        image_url: article.urlToImage || "",
        source_url: article.url,
        category_id: category.id,
        seo_keywords: seoKeywords,
        published_at: new Date(article.publishedAt).toISOString(),
      };

      await createBlogPost(blogPost);

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log("✅ Blog publishing completed!");
  } catch (error) {
    console.error("Error in blog publishing:", error);
  }
}

// Run the automation
publishBlogPosts();
