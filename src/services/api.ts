import { ScrapedData, WishList, CreateListRequest, ApiResponse } from '../types';
import { API_BASE } from '../constants';

const LS_KEY = 'wishpocket_db';

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
  // Robust ID generation
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

// Helper to fetch with timeout
// Increased timeout to 8000ms as scraping can be slow
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
      
      // If server returns error JSON, try to read it
      if (contentType?.includes('application/json')) {
          const errJson = await res.json() as any;
          throw new Error(errJson.error || `Server Error: ${res.status}`);
      }

      throw new Error(`Backend unavailable: ${res.status}`);
    } catch (e) {
      console.warn('Scraping failed, falling back to mock data.', e);
      // Fallback only if strictly necessary, but for now we want to see if it works.
      // If we are in "Demo Mode" frequently, user gets confused. 
      // Let's modify the fallback text to be more helpful if it looks like a real error.
      
      await mockDelay();
      // Simple mock for demo
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

  createList: async (data: CreateListRequest): Promise<WishList> => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType?.includes('application/json')) {
        const json = await res.json() as ApiResponse<WishList>;
        if (json.success && json.data) return json.data;
      }
    } catch (e) {
      console.warn('API unavailable, falling back to LocalStorage', e);
    }

    await mockDelay();
    const id = generateId();
    const newList: WishList = {
      id,
      owner: data.owner,
      birthday: data.birthday,
      password: data.password,
      items: [],
      createdAt: Date.now()
    };
    
    const db = getLS();
    db[id] = newList;
    saveLS(db);
    return newList;
  },

  getList: async (id: string): Promise<WishList> => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/list/${id}`);
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType?.includes('application/json')) {
        const json = await res.json() as ApiResponse<WishList>;
        if (json.success && json.data) return json.data;
      }
    } catch (e) {
      console.warn('API unavailable, falling back to LocalStorage', e);
    }

    await mockDelay();
    const db = getLS();
    const list = db[id];
    if (!list) throw new Error('List not found (Local)');
    return list;
  },

  updateList: async (id: string, listData: Partial<WishList>): Promise<WishList> => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/list/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listData),
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType?.includes('application/json')) {
        const json = await res.json() as ApiResponse<WishList>;
        if (json.success && json.data) return json.data;
      }
    } catch (e) {
      console.warn('API unavailable, falling back to LocalStorage', e);
    }

    await mockDelay();
    const db = getLS();
    if (!db[id]) throw new Error('List not found (Local)');
    
    const updated = { ...db[id], ...listData };
    db[id] = updated;
    saveLS(db);
    return updated;
  },

  deleteList: async (id: string): Promise<boolean> => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/list/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) return true;
    } catch (e) {
      console.warn('API unavailable, falling back to LocalStorage', e);
    }

    await mockDelay();
    const db = getLS();
    delete db[id];
    saveLS(db);
    return true;
  }
};