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

    // Fetch HTML with browser-like headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': isNaver ? 'https://search.naver.com/' : 'https://www.google.com/'
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ success: false, error: `Failed to fetch external URL: ${response.status}` }), { status: response.status });
    }

    const html = await response.text();
    const $ = load(html);

    // 1. Try OpenGraph (Standard)
    let title = $('meta[property="og:title"]').attr('content') || '';
    let image = $('meta[property="og:image"]').attr('content') || '';
    let description = $('meta[property="og:description"]').attr('content') || '';
    let siteName = $('meta[property="og:site_name"]').attr('content') || new URL(url).hostname;
    let price = '';

    // 2. Try JSON-LD (Rich Snippets) - High priority for price
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonContent = $(el).html();
        if (jsonContent) {
          const json = JSON.parse(jsonContent);
          // Handle Array of JSON-LD or single object
          const items = Array.isArray(json) ? json : [json];
          
          for (const item of items) {
             if (item['@type'] === 'Product') {
              if (!title && item.name) title = item.name;
              if (!image && item.image) {
                // image can be string or array
                image = Array.isArray(item.image) ? item.image[0] : item.image;
              }
              if (item.offers) {
                const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                if (offer && offer.price) price = String(offer.price);
              }
             }
          }
        }
      } catch(e) {
        // ignore json parse error
      }
    });

    // 3. Platform Specific Fallbacks (CSS Selectors)
    if (isNaver) {
      siteName = 'Naver Shopping';
      
      // Title Fallback
      if (!title) {
        title = $('h3._22kNQuEXmb').text() || 
                $('._22kNQuEXmb').first().text() || 
                $('.prod_name').text() || // Older smartstore
                $('title').text();
      }

      // Price Fallback
      if (!price) {
        // Common SmartStore selectors
        const priceSelectors = [
          '.lowest_price', 
          '._1LY7DqCnwR', 
          '.price_num', 
          '.product_price .price', 
          '.thmb .price'
        ];
        for (const sel of priceSelectors) {
          const txt = $(sel).text();
          if (txt) {
            price = txt;
            break;
          }
        }
      }
    } else if (isMusinsa) {
      // Musinsa logic
      if (!price) {
         price = $('#goods_price').text().trim() || 
              $('.product_article_price').text().trim() ||
              $('meta[property="product:price:amount"]').attr('content') || '';
      }
      const brand = $('.product_info_head .item_categories a').first().text();
      if(brand) siteName = `Musinsa (${brand})`;
      else siteName = 'Musinsa';

    } else if (isOhHouse) {
      // Ohouse
      if (!title) title = $('.production-selling-header__title__name').text();
      if (!price) price = $('.production-selling-header__price__price .number').first().text();
      siteName = '오늘의집';
    }

    // 4. Final Cleanup
    // Remove "NAVER ... : Brand Name" suffix from title if common
    if (isNaver && title.includes(' : 네이버 쇼핑')) {
      title = title.split(' : 네이버 쇼핑')[0];
    }
    
    title = title.trim();
    price = price.replace(/[^0-9]/g, ''); // Keep only numbers

    // If still no title, use URL
    if (!title) title = url;

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