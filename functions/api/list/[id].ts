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

// GET: Retrieve List
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  const listRaw = await context.env.WISH_KV.get(`list:${id}`);

  if (!listRaw) {
    return new Response(JSON.stringify({ success: false, error: 'List not found' }), { status: 404 });
  }

  const list = JSON.parse(listRaw);

  // Check Logical Expiry (Birthday + 7 days)
  if (list.birthday) {
     const bdayDate = new Date(list.birthday);
     const today = new Date();
     // Set bday year to current year to check "this year's birthday"
     // Note: This is a simplified logic. Real logic might depend on whether the birthday has passed *this year* or not.
     // For this MVP, we rely on the KV TTL for hard deletion, and this check for soft blocking if needed.
     // Let's rely on KV TTL for simplicity as requested by "Auto-Expiry Logic ... using KV TTL".
  }

  // Remove password before sending to client
  const { password, ...safeList } = list;

  return new Response(JSON.stringify({ success: true, data: safeList }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

// PATCH: Update List (Add/Remove Items)
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  const body = await context.request.json() as any;
  
  const listRaw = await context.env.WISH_KV.get(`list:${id}`);
  if (!listRaw) return new Response(JSON.stringify({ success: false, error: 'List not found' }), { status: 404 });

  const list = JSON.parse(listRaw);

  // Security check: In a real app, verify password or token here. 
  // For MVP, we assume possession of the ID allows editing (or check password if sent in body).

  const updatedList = {
    ...list,
    ...body,
    id: list.id // Ensure ID doesn't change
  };

  await context.env.WISH_KV.put(`list:${id}`, JSON.stringify(updatedList), { expirationTtl: 60 * 60 * 24 * 45 }); // Reset TTL on activity

  // Return safe list
  const { password, ...safeList } = updatedList;
  return new Response(JSON.stringify({ success: true, data: safeList }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

// DELETE: Delete List
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  // In real app, require Admin header or password match
  await context.env.WISH_KV.delete(`list:${id}`);
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};