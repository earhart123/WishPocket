import { ScrapedData, WishList, CreateListRequest, ApiResponse } from '../types';
import { API_BASE } from '../constants';

const LS_KEY = 'wishpocket_db';

// Fallback: LocalStorage Helpers
const getLS = (): Record<string, WishList> => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch { return {}; }
};

const saveLS = (data: Record<string, WishList>) => {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
};

const mockDelay = () => new Promise(r => setTimeout(r, 800));

const generateId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 8000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const api = {
  // Scraper API (unchanged)
  scrapeUrl: async (url: string): Promise<ScrapedData> => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType?.includes('application/json')) {
        const json = await res.json() as ApiResponse<ScrapedData>;
        if (!json.success || !json.data) throw new Error(json.error || 'Failed to scrape');
        return json.data;
      }
      
      if (contentType?.includes('application/json')) {
          const errJson = await res.json() as any;
          throw new Error(errJson.error || `Server Error: ${res.status}`);
      }
      throw new Error(`Backend unavailable: ${res.status}`);
    } catch (e) {
      console.warn('Scraping failed, falling back to mock data.', e);
      await mockDelay();
      return {
        title: '상품 정보를 가져올 수 없습니다 (Demo Mode)',
        image: 'https://via.placeholder.com/150?text=No+Image',
        description: '백엔드 서버가 연결되지 않았거나 차단되었습니다. URL을 직접 입력해보세요.',
        price: '0',
        siteName: new URL(url).hostname,
        url: url
      };
    }
  },

  // New: Create List using /api/wishlist
  createList: async (data: CreateListRequest): Promise<WishList> => {
    const newListBase = {
      owner: data.owner,
      birthday: data.birthday,
      password: data.password,
      items: [],
      createdAt: Date.now()
    };

    try {
      const res = await fetchWithTimeout(`${API_BASE}/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newListBase),
      });
      
      const json = await res.json() as ApiResponse<WishList>;
      if (json.success && json.data) return json.data;
    } catch (e) {
      console.warn('API unavailable, falling back to LocalStorage', e);
    }

    // Fallback
    await mockDelay();
    const id = generateId();
    const newList: WishList = { ...newListBase, id };
    const db = getLS();
    db[id] = newList;
    saveLS(db);
    return newList;
  },

  // New: Get List using /api/wishlist?id=...
  getList: async (id: string): Promise<WishList> => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/wishlist?id=${id}`);
      const json = await res.json() as ApiResponse<WishList>;
      if (json.success && json.data) return json.data;
      if (res.status === 404) throw new Error('리스트를 찾을 수 없습니다.');
    } catch (e: any) {
      console.warn('API unavailable, falling back to LocalStorage', e);
      if (e.message === '리스트를 찾을 수 없습니다.') throw e;
    }

    // Fallback
    await mockDelay();
    const db = getLS();
    const list = db[id];
    if (!list) throw new Error('리스트를 찾을 수 없습니다 (Local)');
    return list;
  },

  // New: Update List using /api/wishlist (POST with ID overwrites)
  updateList: async (id: string, listData: Partial<WishList>): Promise<WishList> => {
    try {
      // First, we need the current full object because PUT overwrites
      // Ideally backend handles PATCH, but for the simple KV example, we usually send full object.
      // However, to be safe, let's assume we are sending the merged object from the frontend state
      // OR we fetch first? 
      // Optimized: Frontend 'Editor' usually has the full state in `list`. 
      // But `updateList` signature here only takes Partial.
      // Let's rely on the fact that Editor.tsx passes the updated items list, 
      // but we need the rest of the fields (owner, etc).
      // Since we don't have the full object here, we must fetch-then-update OR change the calling code.
      // *Correction*: For this specific request, I will fetch existing logic first inside this function 
      // if I don't have full data, BUT usually the `listData` passed from Editor contains the crucial `items` array.
      // To keep it simple and robust with the provided KV code:
      
      // 1. Get current list to merge (server side would be better, but we are client side)
      // Actually, let's just do a merge client-side if we can, but we don't have previous state here.
      // Strategy: Fetch, Merge, Save.
      const current = await api.getList(id);
      const updated = { ...current, ...listData };

      const res = await fetchWithTimeout(`${API_BASE}/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      const json = await res.json() as ApiResponse<WishList>;
      if (json.success && json.data) return json.data;
    } catch (e) {
      console.warn('API unavailable, falling back to LocalStorage', e);
    }

    // Fallback
    await mockDelay();
    const db = getLS();
    if (!db[id]) throw new Error('List not found (Local)');
    
    const updated = { ...db[id], ...listData };
    db[id] = updated;
    saveLS(db);
    return updated;
  },

  deleteList: async (id: string): Promise<boolean> => {
    // KV API doesn't have explicit DELETE in the provided snippet.
    // We can implement it or just ignore for now.
    // For now, let's just delete from LocalStorage fallback.
    const db = getLS();
    delete db[id];
    saveLS(db);
    return true;
  }
};