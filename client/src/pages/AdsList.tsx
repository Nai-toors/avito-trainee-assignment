import { useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { fetchAds, api } from "../api/api";
import type { AdsResponse } from "../types";
import { useDebounce } from "../hooks/useDebounce";

import {
  Container,
  Card,
  CardMedia,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Pagination,
  Box,
  Chip,
  Stack,
  Checkbox,
  OutlinedInput,
  Alert,
  CircularProgress,
  Paper,
  SelectChangeEvent,
} from "@mui/material";

import Grid from "@mui/material/Grid2";
import StarIcon from "@mui/icons-material/Star";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

const CATEGORIES = [
  { id: 0, name: "Электроника" },
  { id: 1, name: "Недвижимость" },
  { id: 2, name: "Транспорт" },
  { id: 3, name: "Работа" },
  { id: 4, name: "Услуги" },
  { id: 5, name: "Животные" },
  { id: 6, name: "Мода" },
  { id: 7, name: "Детское" },
];

const STATUSES = [
  { value: "pending", label: "На модерации" },
  { value: "approved", label: "Одобрено" },
  { value: "rejected", label: "Отклонено" },
  { value: "draft", label: "Черновик" },
];

export const AdsList = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAdIds, setSelectedAdIds] = useState<number[]>([]);

  // чтение параметров из URL (источник правды для API)
  const page = Number(searchParams.get("page")) || 1;
  const category = searchParams.get("category") || "";
  const statusParam = searchParams.getAll("status");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

  // URL параметры для текстовых полей (нужны для инициализации)
  const urlSearch = searchParams.get("search") || "";
  const urlMinPrice = searchParams.get("minPrice") || "";
  const urlMaxPrice = searchParams.get("maxPrice") || "";

  // локальное состояние для полей ввода (чтобы не дергать API при каждом нажатии)
  const [localSearch, setLocalSearch] = useState(urlSearch);
  const [localMinPrice, setLocalMinPrice] = useState(urlMinPrice);
  const [localMaxPrice, setLocalMaxPrice] = useState(urlMaxPrice);

  // дебаунс значений (ждем 500мс тишины)
  const debouncedSearch = useDebounce(localSearch, 500);
  const debouncedMinPrice = useDebounce(localMinPrice, 500);
  const debouncedMaxPrice = useDebounce(localMaxPrice, 500);

  // синхронизация Дебаунс значений с URL
  // этот эффект сработает только когда пользователь перестанет печатать
  useEffect(() => {
    // проверяем, изменилось ли значение относительно того, что уже в URL,
    // чтобы избежать циклических обновлений
    const currentParams = new URLSearchParams(searchParams);
    let changed = false;

    if (debouncedSearch !== urlSearch) {
      if (debouncedSearch) currentParams.set("search", debouncedSearch);
      else currentParams.delete("search");
      changed = true;
    }

    if (debouncedMinPrice !== urlMinPrice) {
      if (debouncedMinPrice) currentParams.set("minPrice", debouncedMinPrice);
      else currentParams.delete("minPrice");
      changed = true;
    }

    if (debouncedMaxPrice !== urlMaxPrice) {
      if (debouncedMaxPrice) currentParams.set("maxPrice", debouncedMaxPrice);
      else currentParams.delete("maxPrice");
      changed = true;
    }

    if (changed) {
      currentParams.set("page", "1"); // сброс на 1 страницу при поиске
      setSearchParams(currentParams);
    }
  }, [
    debouncedSearch,
    debouncedMinPrice,
    debouncedMaxPrice,
    searchParams,
    setSearchParams,
    urlSearch,
    urlMinPrice,
    urlMaxPrice,
  ]);

  const limit = 10;

  // запрос данных
  const { data, isLoading, isError, isFetching } = useQuery<AdsResponse>({
    queryKey: [
      "ads",
      page,
      // в queryKey используем параметры из URL (они обновляются с задержкой для текста)
      urlSearch,
      category,
      statusParam,
      urlMinPrice,
      urlMaxPrice,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      fetchAds({
        page,
        limit,
        search: urlSearch,
        categoryId: category ? Number(category) : undefined,
        status: statusParam.length > 0 ? statusParam : undefined,
        minPrice: urlMinPrice ? Number(urlMinPrice) : undefined,
        maxPrice: urlMaxPrice ? Number(urlMaxPrice) : undefined,
        sortBy,
        sortOrder,
      }),
    // оставляем старые данные пока грузятся новые - убирает "мигание" интерфейса
    placeholderData: keepPreviousData,
    //  !! автообновление списка (в мс) - задание со *, однако что означает "Статус объявления" в пунтке 6.3 я не понял,
    // так же не вижу смысл писать логику счётчика новых объявлений, т.к. сервер их не предоставляет (невозможно проверить результат)
    refetchInterval: 10000,
  });

  // bulk actions
  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const promises = ids.map((id) => api.post(`/ads/${id}/approve`));
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      setSelectedAdIds([]);
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const promises = ids.map((id) =>
        api.post(`/ads/${id}/reject`, {
          reason: "Другое",
          comment: "Массовое отклонение",
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      setSelectedAdIds([]);
    },
  });

  // хендлеры

  // Для select'ов (категория, статус, сортировка) обновление мгновенное
  const updateFilterImmediate = (
    key: string,
    value: string | string[] | null
  ) => {
    const newParams = new URLSearchParams(searchParams);
    if (
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      newParams.delete(key);
    } else if (Array.isArray(value)) {
      newParams.delete(key);
      value.forEach((v) => newParams.append(key, v));
    } else {
      newParams.set(key, value);
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setSearchParams({});
    // сбрасываем локальные стейты
    setLocalSearch("");
    setLocalMinPrice("");
    setLocalMaxPrice("");
    setSelectedAdIds([]);
  };

  const handleSelectAd = (id: number) => {
    setSelectedAdIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && data?.ads) {
      setSelectedAdIds(data.ads.map((ad) => ad.id));
    } else {
      setSelectedAdIds([]);
    }
  };

  // РЕНДЕР

  // если нет данных и идет первая загрузка
  if (isLoading)
    return (
      <Container sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );

  if (isError)
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">
          Не удалось загрузить объявления. Проверьте соединение с сервером.
        </Alert>
      </Container>
    );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4">
          Список объявлений
          {/* индикатор фоновой загрузки при смене фильтров */}
          {isFetching && <CircularProgress size={20} sx={{ ml: 2 }} />}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<FilterListOffIcon />}
          onClick={handleResetFilters}
        >
          Сбросить фильтры
        </Button>
      </Box>

      {/* фильтры */}
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              label="Поиск по названию"
              variant="outlined"
              size="small"
              // привязываем к локальному стейту
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Категория</InputLabel>
              <Select
                value={category}
                label="Категория"
                onChange={(e) =>
                  updateFilterImmediate("category", e.target.value)
                }
              >
                <MenuItem value="">
                  <em>Все</em>
                </MenuItem>
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Статус</InputLabel>
              <Select
                multiple
                value={statusParam}
                onChange={(e: SelectChangeEvent<string[]>) => {
                  const value = e.target.value;
                  updateFilterImmediate(
                    "status",
                    typeof value === "string" ? value.split(",") : value
                  );
                }}
                input={<OutlinedInput label="Статус" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={STATUSES.find((s) => s.value === value)?.label}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <TextField
              fullWidth
              label="Цена от"
              type="number"
              size="small"
              // привязываем к локальному стейту
              value={localMinPrice}
              onChange={(e) => setLocalMinPrice(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <TextField
              fullWidth
              label="Цена до"
              type="number"
              size="small"
              // привязываем к локальному стейту
              value={localMaxPrice}
              onChange={(e) => setLocalMaxPrice(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Сортировка</InputLabel>
              <Select
                value={sortBy}
                label="Сортировка"
                onChange={(e) =>
                  updateFilterImmediate("sortBy", e.target.value)
                }
              >
                <MenuItem value="createdAt">По дате</MenuItem>
                <MenuItem value="price">По цене</MenuItem>
                <MenuItem value="priority">По приоритету</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Порядок</InputLabel>
              <Select
                value={sortOrder}
                label="Порядок"
                onChange={(e) =>
                  updateFilterImmediate("sortOrder", e.target.value)
                }
              >
                <MenuItem value="desc">Сначала новые/дорогие</MenuItem>
                <MenuItem value="asc">Сначала старые/дешевые</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* массовые действия */}
      {selectedAdIds.length > 0 && (
        <Paper
          elevation={4}
          sx={{
            p: 2,
            mb: 2,
            position: "sticky",
            top: 20,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: "#e3f2fd",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            Выбрано: {selectedAdIds.length}
          </Typography>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={() => bulkApproveMutation.mutate(selectedAdIds)}
            disabled={bulkApproveMutation.isPending}
          >
            Одобрить
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<CancelIcon />}
            onClick={() => bulkRejectMutation.mutate(selectedAdIds)}
            disabled={bulkRejectMutation.isPending}
          >
            Отклонить
          </Button>
        </Paper>
      )}

      {/* список объявлений */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Checkbox
              checked={
                !!data &&
                data.ads.length > 0 &&
                selectedAdIds.length === data.ads.length
              }
              indeterminate={
                !!data &&
                selectedAdIds.length > 0 &&
                selectedAdIds.length < data.ads.length
              }
              onChange={handleSelectAll}
            />
            <Typography>Выбрать все на странице</Typography>
          </Box>
        </Grid>

        {data?.ads.map((ad) => (
          <Grid key={ad.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                border: selectedAdIds.includes(ad.id)
                  ? "2px solid #1976d2"
                  : "none",
                opacity: isFetching ? 0.6 : 1, // визуальный эффект при подгрузке (типо данные обновились)
                transition: "opacity 0.2s",
              }}
            >
              <Checkbox
                sx={{
                  position: "absolute",
                  top: 5,
                  left: 5,
                  zIndex: 2,
                  bgcolor: "rgba(255,255,255,0.8)",
                }}
                checked={selectedAdIds.includes(ad.id)}
                onChange={() => handleSelectAd(ad.id)}
              />

              {ad.priority === "urgent" && (
                <Chip
                  label="Срочно"
                  color="secondary"
                  size="small"
                  icon={<StarIcon />}
                  sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}
                />
              )}

              <CardMedia
                component="img"
                height="160"
                image={ad.images[0] || "https://via.placeholder.com/300"}
                alt={ad.title}
              />
              <CardContent
                sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Chip
                    label={
                      STATUSES.find((s) => s.value === ad.status)?.label ||
                      ad.status
                    }
                    size="small"
                    color={
                      ad.status === "approved"
                        ? "success"
                        : ad.status === "rejected"
                        ? "error"
                        : "default"
                    }
                    variant={ad.status === "pending" ? "outlined" : "filled"}
                  />
                  <Typography variant="h6" fontWeight="bold">
                    {ad.price.toLocaleString()} ₽
                  </Typography>
                </Box>

                <Typography
                  variant="subtitle1"
                  noWrap
                  title={ad.title}
                  sx={{ fontWeight: "bold", mb: 0.5 }}
                >
                  {ad.title}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {ad.category}
                </Typography>

                <Box sx={{ mt: "auto", pt: 2 }}>
                  <Typography
                    variant="caption"
                    display="block"
                    color="text.disabled"
                    sx={{ mb: 1 }}
                  >
                    {new Date(ad.createdAt).toLocaleDateString()}
                  </Typography>
                  <Button
                    component={Link}
                    to={`/item/${ad.id}`}
                    variant="contained"
                    fullWidth
                    size="small"
                  >
                    Проверить
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* пагинация */}
      {data && data.pagination.totalPages > 1 && (
        <Stack spacing={2} sx={{ mt: 4, alignItems: "center" }}>
          <Pagination
            count={data.pagination.totalPages}
            page={page}
            onChange={(_, val) => {
              const newParams = new URLSearchParams(searchParams);
              newParams.set("page", val.toString());
              setSearchParams(newParams);
              window.scrollTo(0, 0);
            }}
            color="primary"
            showFirstButton
            showLastButton
            disabled={isFetching}
          />
          <Typography variant="caption" color="text.secondary">
            Всего: {data.pagination.totalItems} объявлений
          </Typography>
        </Stack>
      )}
    </Container>
  );
};
