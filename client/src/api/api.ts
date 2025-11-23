import axios from "axios";
import type { AdDetails, AdsResponse } from "../types";

const API_URL = "http://localhost:3001/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  // чтобы массивы (статусы) корректно улетали на сервер
  paramsSerializer: {
    indexes: false, // status=1&status=2 вместо status[]=1
  },
});

// эта функция принимает params и возвращает Promise,
// который содержит AdsResponse (типы из /types)
export const fetchAds = async (
  params: {
    page: number;
    limit: number;
    search?: string; // ? означает, что поле необязательное
    categoryId?: number;
    status?: string[];
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: string;
  },
  signal?: AbortSignal // задание со * (прерывание запросов). React Query делает это автоматически, но ему нужно передать signal в Axios
) => {
  const { data } = await api.get<AdsResponse>("/ads", { params, signal });
  return data;
};

export const fetchAdById = async (id: string, signal?: AbortSignal) => {
  const { data } = await api.get<AdDetails>(`/ads/${id}`, { signal });
  return data;
};

export const fetchStats = async (
  period: "today" | "week" | "month",
  signal?: AbortSignal
) => {
  const { data } = await api.get("/stats/summary", {
    params: { period },
    signal,
  });
  return data;
};

export const fetchStatsActivity = async (
  period: "today" | "week" | "month",
  signal?: AbortSignal
) => {
  const { data } = await api.get("/stats/chart/activity", {
    params: { period },
    signal,
  });
  return data;
};

export const fetchStatsDecisions = async (
  period: "today" | "week" | "month",
  signal?: AbortSignal
) => {
  const { data } = await api.get("/stats/chart/decisions", {
    params: { period },
    signal,
  });
  return data;
};
