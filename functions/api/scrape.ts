import { load } from 'cheerio';

// Type definitions for Cloudflare Pages Functions
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string | ReadableStream | ArrayBuffer | FormData, options?: any): Promise<void>;
  delete(key: string): Promise<void>;
}

type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<any>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  data: Record<string, unknown>;
}) => Response | Promise<Response>;

interface Env {
  WISH_KV: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { url } = await context.request.json() as { url: string };
    
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: 'URL is required' }), { status: 400 });
    }

    // Identify Platform
    const isNaver = url.includes('naver.com');
    const isMusinsa = url.includes('musinsa.com');
    const isOhHouse = url.includes('ohou.se');

    // Fetch HTML
    // Note: Some sites might block bots. In a production Worker, you might need a proxy or set User-Agent.
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ success: false, error: 'Failed to fetch external URL' }), { status: 500 });
    }

    const html = await response.text();
    const $ = load(html);

    // Default Extraction (OpenGraph)
    let title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    let image = $('meta[property="og:image"]').attr('content') || '';
    let description = $('meta[property="og:description"]').attr('content') || '';
    let siteName = $('meta[property="og:site_name"]').attr('content') || new URL(url).hostname;
    let price = '';

    // Platform Specific Logic
    if (isNaver) {
      // Naver SmartStore
      // Try JSON-LD first (most reliable)
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).html() || '{}');
          if (json['@type'] === 'Product') {
            if (json.name) title = json.name;
            if (json.image) image = json.image;
            if (json.offers?.price) price = json.offers.price;
          }
        } catch(e) {}
      });

      // Naver Selectors fallback
      if (!price) {
        price = $('._22kNQuEXmb').first().text() || // Common price class
                $('span.lowest_price').text() ||
                $('.price_num').text(); 
      }
      siteName = 'Naver Shopping';
    } else if (isMusinsa) {
      // Musinsa
      // Price is tricky on Musinsa due to dynamic loading, but often present in metadata or specific spans
      price = $('#goods_price').text().trim() || 
              $('.product_article_price').text().trim() ||
              $('meta[property="product:price:amount"]').attr('content') || '';
      
      const brand = $('.product_info_head .item_categories a').first().text();
      if(brand) siteName = `Musinsa (${brand})`;
      else siteName = 'Musinsa';

    } else if (isOhHouse) {
      // Ohouse (Today's House)
      // Usually "production-selling-header__title"
      const ohouTitle = $('.production-selling-header__title__name').text();
      if (ohouTitle) title = ohouTitle;

      const ohouPrice = $('.production-selling-header__price__price .number').first().text();
      if (ohouPrice) price = ohouPrice;

      siteName = '오늘의집';
    }

    // Cleanup data
    title = title.trim();
    price = price.replace(/[^0-9]/g, ''); // Keep only numbers

    return new Response(JSON.stringify({
      success: true,
      data: {
        title,
        image,
        description,
        siteName,
        price,
        url
      }
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}