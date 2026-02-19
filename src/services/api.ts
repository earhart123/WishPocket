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
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 3000) => {
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
      throw new Error('Backend unavailable');
    } catch (e) {
      console.warn('Backend unavailable or timed out. Using mock data.', e);
      await mockDelay();
      // Simple mock for demo
      return {
        title: '상품 정보를 가져올 수 없습니다 (Demo Mode)',
        image: 'https://via.placeholder.com/150?text=No+Image',
        description: '백엔드 서버가 연결되지 않아 예시 데이터를 표시합니다. (네트워크 타임아웃)',
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