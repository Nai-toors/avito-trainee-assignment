// объявляем типы данных, которые должен прислать сервер

// описание одного объявления
export interface Ad {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  categoryId: number;
  status: "pending" | "approved" | "rejected" | "draft"; // статусы
  priority: "normal" | "urgent";
  createdAt: string;
  images: string[];
  seller: {
    name: string;
    rating: string;
  };
}

// описание того, что приходит при запросе списка (ответ сервера)
export interface AdsResponse {
  ads: Ad[]; // массив объявлений
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// описание детальной страницы (там больше полей)
export interface AdDetails extends Ad {
  characteristics: Record<string, string>;
  moderationHistory: {
    id: number;
    action: string;
    reason: string | null;
    comment: string;
    timestamp: string;
    moderatorName: string;
  }[];
}