export interface ScrapedData {
  title: string;
  image: string;
  price: string;
  description: string;
  siteName: string;
  url: string;
}

export interface WishItem extends ScrapedData {
  id: string;
  comment?: string;
  priority?: number; // 0 = normal, 1 = high
}

export interface WishList {
  id: string;
  owner: string;
  birthday: string; // YYYY-MM-DD
  items: WishItem[];
  password?: string; // Simple protection for editing
  createdAt: number;
}

export interface CreateListRequest {
  owner: string;
  birthday: string;
  password?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
