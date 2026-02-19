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
    const data = await context.request.json() as any;
    
    // ID가 있으면(수정) 그 ID 사용, 없으면(생성) 새로 생성
    const id = data.id || crypto.randomUUID();
    
    // 저장할 데이터에 ID 포함 보장
    const finalData = { ...data, id };

    // 💡 KV에 저장 (TTL: 45일)
    await context.env.WISH_KV.put(id, JSON.stringify(finalData), { expirationTtl: 60 * 60 * 24 * 45 });
    
    return new Response(JSON.stringify({ success: true, id, data: finalData }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');

  if (!id) return new Response(JSON.stringify({ success: false, error: "ID missing" }), { status: 400 });

  // 💡 저장된 데이터를 꺼내옵니다!
  const data = await context.env.WISH_KV.get(id);

  if (!data) {
    return new Response(JSON.stringify({ success: false, error: "Not found" }), { status: 404 });
  }

  return new Response(JSON.stringify({ success: true, data: JSON.parse(data) }), { 
    headers: { 'Content-Type': 'application/json' } 
  });
}