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
    const body = await context.request.json() as any;
    const { owner, birthday, password } = body;

    if (!owner || !birthday) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now();
    
    // Cloudflare KV TTL is in seconds. Min 60.
    const TTL = 60 * 60 * 24 * 45; // 45 Days

    const newList = {
      id,
      owner,
      birthday,
      password, // In prod, hash this!
      items: [],
      createdAt: now
    };

    await context.env.WISH_KV.put(`list:${id}`, JSON.stringify(newList), { expirationTtl: TTL });

    return new Response(JSON.stringify({ success: true, data: newList }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
}