import axios from 'axios';
import type { AdDetails, AdsResponse } from '../types';

const API_URL = 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
});

// Мы говорим: эта функция принимает params и возвращает Promise, 
// который содержит AdsResponse (наши типы из шага 1)
export const fetchAds = async (params: {
  page: number;
  limit: number;
  search?: string;     // ? означает, что поле необязательное
  categoryId?: number;
  status?: string;
}) => {
  // axios.get<AdsResponse> — это подсказка для axios, какой тип данных вернется
  const { data } = await api.get<AdsResponse>('/ads', { params });
  return data;
};

export const fetchAdById = async (id: string) => {
  const { data } = await api.get<AdDetails>(`/ads/${id}`);
  return data;
};