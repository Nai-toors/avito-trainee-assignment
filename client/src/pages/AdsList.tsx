import { useState, useEffect, useRef } from "react";
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
  InputAdornment,
  alpha,
  Fade,
  useTheme,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";

import Grid from "@mui/material/Grid2";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "@mui/icons-material/Sort";

// Пастельные цвета для категорий (как в красивой версии)
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
  { value: "pending", label: "На модерации", color: "warning" as const },
  { value: "approved", label: "Одобрено", color: "success" as const },
  { value: "rejected", label: "Отклонено", color: "error" as const },
  { value: "draft", label: "Черновик", color: "default" as const },
];

export const AdsList = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAdIds, setSelectedAdIds] = useState<number[]>([]);
  const theme = useTheme(); // bспользуем тему

  // ref для поля поиска (для горячей клавиши /)
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // синхронизация дебаунс значений с URL
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

  // hotkey '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // если нажали '/' и фокус НЕ в поле ввода
      if (
        e.key === "/" &&
        (e.target as HTMLElement).tagName !== "INPUT" &&
        (e.target as HTMLElement).tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const limit = 10;

  // запрос данных
  const { data, isLoading, isError, isFetching } = useQuery<AdsResponse>({
    queryKey: [
      "ads",
      page,
      urlSearch,
      category,
      statusParam,
      urlMinPrice,
      urlMaxPrice,
      sortBy,
      sortOrder,
    ],
    queryFn: ({ signal }) =>
      fetchAds(
        {
          page,
          limit,
          search: urlSearch,
          categoryId: category ? Number(category) : undefined,
          status: statusParam.length > 0 ? statusParam : undefined,
          minPrice: urlMinPrice ? Number(urlMinPrice) : undefined,
          maxPrice: urlMaxPrice ? Number(urlMaxPrice) : undefined,
          sortBy,
          sortOrder,
        },
        signal
      ),
    // оставляем старые данные пока грузятся новые - убирает "мигание" интерфейса
    placeholderData: keepPreviousData,
    //  !! автообновление списка (в мс) - задание со *, однако что означает "Статус объявления" в пунтке 6.3 я не понял,
    // так же не вижу смысл писать логику счётчика новых объявлений, т.к. сервер их не предоставляет (невозможно проверить результат)
    refetchInterval: 10000,
  });

  // Bulk actions
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
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, color: "text.primary" }}
        >
          Список объявлений
          {isFetching && (
            <CircularProgress size={24} sx={{ ml: 2, color: "primary.main" }} />
          )}
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
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          p: 2,
          mb: 4,
          borderRadius: 3,
          bgcolor: "background.paper",
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          {/* поиск */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              size="small"
              inputRef={searchInputRef} // привязываем ref для фокуса по '/'
              placeholder="Поиск по названию (/)"
              // привязываем к локальному стейту
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          </Grid>

          {/* категория */}
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Категория</InputLabel>
              <Select
                value={category}
                label="Категория"
                onChange={(e) =>
                  updateFilterImmediate("category", e.target.value)
                }
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">Все категории</MenuItem>
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* статус */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                    {selected.map((value) => {
                      const status = STATUSES.find((s) => s.value === value);
                      return (
                        <Chip
                          key={value}
                          label={status?.label}
                          size="small"
                          sx={{
                            // ИСПРАВЛЕНО: более мягкая работа с цветами через theme.palette
                            bgcolor: alpha(
                              status?.color === "default"
                                ? theme.palette.action.selected
                                : theme.palette[status?.color || "primary"]
                                    .main,
                              0.15
                            ),
                            color:
                              status?.color === "default"
                                ? "text.primary"
                                : `${status?.color}.main`,
                            fontWeight: 600,
                            borderRadius: 1,
                          }}
                        />
                      );
                    })}
                  </Box>
                )}
                sx={{ borderRadius: 2 }}
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    <Checkbox
                      checked={statusParam.includes(s.value)}
                      size="small"
                    />
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* цена */}
          <Grid size={{ xs: 6, md: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Цена от"
              type="number"
              value={localMinPrice}
              onChange={(e) => setLocalMinPrice(e.target.value)}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Цена до"
              type="number"
              value={localMaxPrice}
              onChange={(e) => setLocalMaxPrice(e.target.value)}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          </Grid>

          {/* сортировка */}
          <Grid size={{ xs: 12 }} container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 6, md: "auto" }}>
              <Button
                color={sortBy === "createdAt" ? "primary" : "inherit"}
                onClick={() => updateFilterImmediate("sortBy", "createdAt")}
                startIcon={<SortIcon />}
                size="small"
              >
                По дате
              </Button>
            </Grid>
            <Grid size={{ xs: 6, md: "auto" }}>
              <Button
                color={sortBy === "price" ? "primary" : "inherit"}
                onClick={() => updateFilterImmediate("sortBy", "price")}
                startIcon={<SortIcon />}
                size="small"
              >
                По цене
              </Button>
            </Grid>
            <Grid size={{ xs: 6, md: "auto" }}>
              <Button
                onClick={() =>
                  updateFilterImmediate(
                    "sortOrder",
                    sortOrder === "asc" ? "desc" : "asc"
                  )
                }
                size="small"
                color="inherit"
              >
                {sortOrder === "asc"
                  ? "↑ Сначала старые/дешевые"
                  : "↓ Сначала новые/дорогие"}
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      {/* массовые действия */}
      {selectedAdIds.length > 0 && (
        <Fade in>
          <Paper
            elevation={4}
            sx={{
              position: "fixed",
              bottom: 30,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              p: 1.5,
              borderRadius: 50,
              display: "flex",
              alignItems: "center",
              gap: 2,
              pl: 3,
              pr: 1.5,
              bgcolor: "text.primary",
              color: "background.paper",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Выбрано: {selectedAdIds.length}
            </Typography>
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<CheckCircleIcon />}
              onClick={() => bulkApproveMutation.mutate(selectedAdIds)}
              disabled={bulkApproveMutation.isPending}
              sx={{ borderRadius: 20, textTransform: "none" }}
            >
              Одобрить
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              startIcon={<CancelIcon />}
              onClick={() => bulkRejectMutation.mutate(selectedAdIds)}
              disabled={bulkRejectMutation.isPending}
              sx={{ borderRadius: 20, textTransform: "none" }}
            >
              Отклонить
            </Button>
            <Button
              size="small"
              onClick={() => setSelectedAdIds([])}
              sx={{ color: "grey.500", minWidth: 0, p: 1, borderRadius: "50%" }}
            >
              <CancelIcon />
            </Button>
          </Paper>
        </Fade>
      )}

      <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
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
          size="small"
          sx={{ color: "#667eea", "&.Mui-checked": { color: "#764ba2" } }}
        />
        <Typography variant="body2" color="text.secondary">
          Выбрать все на этой странице
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {data?.ads.map((ad) => {
          const isSelected = selectedAdIds.includes(ad.id);
          const statusConfig = STATUSES.find((s) => s.value === ad.status);

          return (
            <Grid key={ad.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  borderRadius: 3,
                  border: isSelected
                    ? `2px solid ${theme.palette.primary.main}`
                    : `1px solid ${theme.palette.divider}`,
                  bgcolor: isSelected
                    ? alpha(theme.palette.primary.main, 0.05)
                    : "background.paper",
                  opacity: isFetching ? 0.6 : 1,
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "text.secondary",
                    boxShadow: 4,
                    transform: "translateY(-2px)",
                  },
                }}
              >
                {/* чекбокс для bulk actions */}
                <Checkbox
                  sx={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    zIndex: 2,
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: "blur(4px)",
                    borderRadius: 1,
                    p: 0.5,
                    "&:hover": { bgcolor: "background.paper" },
                  }}
                  size="small"
                  checked={isSelected}
                  onChange={() => handleSelectAd(ad.id)}
                />

                {/* статус "Срочно" */}
                {ad.priority === "urgent" && (
                  <Chip
                    label="Срочно"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      zIndex: 2,
                      background:
                        "linear-gradient(135deg, #ad2f32ff 0%, #ff0000ff 100%)",
                      color: "white",
                      fontWeight: 700,
                      borderRadius: 2,
                      height: 24,
                      boxShadow: "0 2px 8px rgba(245, 87, 108, 0.3)",
                      border: "none",
                      "& .MuiChip-label": { paddingLeft: 1, paddingRight: 1 },
                    }}
                  />
                )}

                <CardMedia
                  component="img"
                  height="160"
                  image={ad.images[0] || "https://via.placeholder.com/300"}
                  alt={ad.title}
                  sx={{ bgcolor: "#f0f0f0", objectFit: "cover" }}
                />

                <CardContent
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    p: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    {/* статусы */}
                    <Chip
                      label={statusConfig?.label}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        borderRadius: 1.5,
                        bgcolor: alpha(
                          statusConfig?.color === "default"
                            ? theme.palette.action.selected
                            : theme.palette[statusConfig?.color || "primary"]
                                .main,
                          0.15
                        ),
                        color:
                          statusConfig?.color === "default"
                            ? "text.secondary"
                            : `${statusConfig?.color}.main`,
                      }}
                    />
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      sx={{ fontSize: "1.1rem" }}
                    >
                      {ad.price.toLocaleString()} ₽
                    </Typography>
                  </Box>

                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 600,
                      mb: 0.5,
                      lineHeight: 1.3,
                      height: "2.6em",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      color: "text.primary",
                    }}
                    title={ad.title}
                  >
                    {ad.title}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1, fontSize: "0.85rem" }}
                  >
                    {ad.category}
                  </Typography>

                  <Box
                    sx={{ mt: "auto", pt: 2, borderTop: "1px solid #f0f0f0" }}
                  >
                    <Typography
                      variant="caption"
                      display="block"
                      color="text.disabled"
                      sx={{ mb: 1 }}
                    >
                      {new Date(ad.createdAt).toLocaleDateString("ru-RU")}
                    </Typography>

                    <Button
                      component={Link}
                      to={`/item/${ad.id}`}
                      state={{
                        fromIds: data.ads.map((item) => item.id),
                        search: searchParams.toString(),
                      }}
                      variant="contained"
                      fullWidth
                      disableElevation
                      size="small"
                      sx={{
                        textTransform: "none",
                        bgcolor: "#71afeeff",
                        color: "#1a1a1a",
                        fontWeight: 600,
                        borderRadius: 2,
                        "&:hover": { bgcolor: "#4a92ebff" },
                      }}
                    >
                      ПРОВЕРИТЬ
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
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
