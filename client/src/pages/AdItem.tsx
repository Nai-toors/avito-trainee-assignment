import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAdById, api } from "../api/api";
import {
  Container,
  Typography,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  CircularProgress,
  IconButton,
} from "@mui/material";

// Иконки
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const REJECTION_REASONS = [
  "Запрещенный товар",
  "Неверная категория",
  "Некорректное описание",
  "Проблемы с фото",
  "Подозрение на мошенничество",
  "Другое",
];

export const AdItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const fromIds = (location.state as { fromIds?: number[] })?.fromIds || [];
  const backSearch = (location.state as { search?: string })?.search || "";

  // --- Состояние ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"reject" | "draft" | null>(null);

  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");

  const [activeImage, setActiveImage] = useState(0);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const {
    data: ad,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["ad", id],
    queryFn: () => fetchAdById(id!),
  });

  // --- Навигация ---
  const { prevId, nextId } = useMemo(() => {
    if (!id || fromIds.length === 0) return { prevId: null, nextId: null };
    const currentIdNum = Number(id);
    const currentIndex = fromIds.indexOf(currentIdNum);

    if (currentIndex === -1) return { prevId: null, nextId: null };

    const prev = currentIndex > 0 ? fromIds[currentIndex - 1] : null;
    const next =
      currentIndex < fromIds.length - 1 ? fromIds[currentIndex + 1] : null;

    return { prevId: prev, nextId: next };
  }, [id, fromIds]);

  const goToAd = (targetId: number) => {
    navigate(`/item/${targetId}`, {
      state: { fromIds, search: backSearch },
    });
    setActiveImage(0);
    window.scrollTo(0, 0);
  };

  const handleBack = useCallback(() => {
    navigate(backSearch ? `/list?${backSearch}` : "/list");
  }, [backSearch, navigate]);

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setReason("");
    setComment("");
    setActionType(null);
  };

  // --- Мутации ---

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/ads/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad", id] });
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      showSnackbar("Объявление одобрено!", "success");
    },
    onError: (error: any) => {
      showSnackbar(error.response?.data?.error || "Ошибка", "error");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (data: { reason: string; comment?: string }) =>
      api.post(`/ads/${id}/reject`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad", id] });
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      closeDialog();
      showSnackbar("Объявление отклонено!", "success");
    },
  });

  const draftMutation = useMutation({
    mutationFn: (data: { reason: string; comment?: string }) =>
      api.post(`/ads/${id}/request-changes`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad", id] });
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      closeDialog();
      showSnackbar("Отправлено на доработку", "success");
    },
  });

  // --- Обработчики действий ---

  const handleActionClick = (type: "reject" | "draft") => {
    setActionType(type);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!reason) {
      showSnackbar("Необходимо указать причину", "error");
      return;
    }

    const payload = { reason, comment };

    if (actionType === "reject") {
      rejectMutation.mutate(payload);
    } else if (actionType === "draft") {
      draftMutation.mutate(payload);
    }
  };

  // --- Горячие клавиши ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).tagName === "INPUT" ||
        (e.target as HTMLElement).tagName === "TEXTAREA" ||
        dialogOpen
      ) {
        return;
      }

      switch (e.code) {
        case "KeyA":
          if (
            !approveMutation.isPending &&
            ad?.status !== "approved" &&
            ad?.status !== "rejected"
          ) {
            approveMutation.mutate();
          }
          break;
        case "KeyD":
          if (ad?.status !== "rejected" && ad?.status !== "approved") {
            handleActionClick("reject");
          }
          break;
        case "ArrowRight":
          if (nextId) goToAd(nextId);
          break;
        case "ArrowLeft":
          if (prevId) goToAd(prevId);
          break;
        case "Escape":
          handleBack();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ad, approveMutation, nextId, prevId, dialogOpen, handleBack]);

  if (isLoading)
    return (
      <Container
        maxWidth="md"
        sx={{ mt: 4, display: "flex", justifyContent: "center" }}
      >
        <CircularProgress />
      </Container>
    );
  if (isError || !ad)
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Ошибка загрузки</Alert>
        <Button onClick={handleBack} sx={{ mt: 2 }}>
          Назад
        </Button>
      </Container>
    );

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 10, position: "relative" }}>
      {/* --- Левая стрелка навигации (Плавающая) --- */}
      <Box>
        <Tooltip title="Предыдущее (←)">
          <IconButton
            onClick={() => prevId && goToAd(prevId)}
            disabled={!prevId}
            sx={{
              position: "fixed",
              left: "20px",
              top: "50%",
              transform: "translateY(-50%)",
              bgcolor: "background.paper",
              boxShadow: 3,
              width: 56,
              height: 56,
              zIndex: 20,
              "&:hover": { bgcolor: "grey.100" },
              display: { xs: "none", lg: "flex" },
            }}
          >
            <ChevronLeftIcon fontSize="large" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* --- Правая стрелка навигации (Плавающая) --- */}
      <Box>
        <Tooltip title="Следующее (→)">
          <IconButton
            onClick={() => nextId && goToAd(nextId)}
            disabled={!nextId}
            sx={{
              position: "fixed",
              right: "20px",
              top: "50%",
              transform: "translateY(-50%)",
              bgcolor: "background.paper",
              boxShadow: 3,
              width: 56,
              height: 56,
              zIndex: 20,
              "&:hover": { bgcolor: "grey.100" },
              display: { xs: "none", lg: "flex" },
            }}
          >
            <ChevronRightIcon fontSize="large" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* кнопка НАЗАД */}
      <Box>
        <Tooltip title="Вернуться к списку (Esc)">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            variant="outlined"
            color="inherit"
            sx={{
              position: "fixed",
              top: "80px",
              left: "20px",
              borderRadius: 50,
              textTransform: "none",
              fontSize: 16,
              fontWeight: 500,
              borderColor: "rgba(0, 0, 0, 0.23)",
              "&:hover": {
                borderColor: "black",
                bgcolor: "rgba(0,0,0,0.04)",
              },
              display: { xs: "none", lg: "flex" }, // скрываем на мобильных, чтобы не мешала
            }}
          >
            Назад
          </Button>
        </Tooltip>
      </Box>

      {/* Заголовок и статус */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mt: 2,
        }}
      >
        <Typography variant="h4">{ad.title}</Typography>
        <Chip
          label={
            ad.status === "pending"
              ? "На модерации"
              : ad.status === "approved"
              ? "Одобрено"
              : ad.status === "rejected"
              ? "Отклонено"
              : "Черновик"
          }
          color={
            ad.status === "approved"
              ? "success"
              : ad.status === "rejected"
              ? "error"
              : "default"
          }
          variant={ad.status === "pending" ? "outlined" : "filled"}
        />
      </Box>
      <Typography variant="subtitle1" color="text.secondary">
        ID: {ad.id} | Создано: {new Date(ad.createdAt).toLocaleString()}
      </Typography>

      {/* Галерея */}
      <Box sx={{ mt: 2 }}>
        <Box
          component="img"
          src={ad.images[activeImage]}
          alt="Main"
          sx={{
            width: "100%",
            maxHeight: 500,
            objectFit: "contain",
            borderRadius: 2,
            bgcolor: "#f0f0f0",
            border: "1px solid #eee",
          }}
        />
        <Box sx={{ display: "flex", gap: 1, mt: 1, overflowX: "auto", pb: 1 }}>
          {ad.images.map((img, index) => (
            <Box
              key={index}
              component="img"
              src={img}
              onClick={() => setActiveImage(index)}
              sx={{
                width: 80,
                height: 80,
                objectFit: "cover",
                borderRadius: 1,
                cursor: "pointer",
                border:
                  activeImage === index
                    ? "2px solid #1976d2"
                    : "2px solid transparent",
                opacity: activeImage === index ? 1 : 0.7,
              }}
            />
          ))}
        </Box>
      </Box>

      <Typography variant="h5" sx={{ mt: 2, fontWeight: "bold" }}>
        {ad.price.toLocaleString()} ₽
      </Typography>

      {/* Продавец */}
      <Paper
        variant="outlined"
        sx={{ p: 2, mt: 2, display: "flex", alignItems: "center", gap: 2 }}
      >
        <Avatar>{ad.seller.name[0]}</Avatar>
        <Box>
          <Typography variant="subtitle1">{ad.seller.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            Рейтинг: {ad.seller.rating} • Объявлений: {ad.seller.totalAds}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            На сайте с {new Date(ad.seller.registeredAt).toLocaleDateString()}
          </Typography>
        </Box>
      </Paper>

      {/* Описание */}
      <Typography variant="h6" sx={{ mt: 3 }}>
        Описание
      </Typography>
      <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
        {ad.description}
      </Typography>

      {/* Характеристики */}
      <Typography variant="h6" sx={{ mt: 3 }}>
        Характеристики
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
        <Table size="small">
          <TableBody>
            {Object.entries(ad.characteristics).map(([key, value]) => (
              <TableRow key={key}>
                <TableCell
                  component="th"
                  scope="row"
                  sx={{ fontWeight: "bold", width: "40%" }}
                >
                  {key}
                </TableCell>
                <TableCell>{value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* История модерации */}
      {ad.moderationHistory.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mt: 3 }}>
            История решений
          </Typography>
          <List dense>
            {ad.moderationHistory.map((item, index) => (
              <ListItem
                key={index}
                divider={index !== ad.moderationHistory.length - 1}
              >
                <ListItemText
                  primary={
                    <Box component="span" sx={{ fontWeight: "medium" }}>
                      {item.action === "approved"
                        ? "Одобрено"
                        : item.action === "rejected"
                        ? "Отклонено"
                        : item.action === "requestChanges"
                        ? "Отправлено на доработку"
                        : item.action}
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        ({item.moderatorName})
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <>
                      <Box component="span" display="block">
                        {new Date(item.timestamp).toLocaleString()}
                      </Box>
                      {item.reason && (
                        <Box
                          component="span"
                          color="error.main"
                          display="block"
                        >
                          Причина: {item.reason}
                        </Box>
                      )}
                      {item.comment && (
                        <Box
                          component="span"
                          display="block"
                          sx={{ fontStyle: "italic" }}
                        >
                          «{item.comment}»
                        </Box>
                      )}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </>
      )}

      <Divider sx={{ my: 4 }} />

      {/* Панель действий */}
      <Paper
        elevation={6}
        sx={{
          display: "flex",
          gap: 2,
          p: 2,
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          bgcolor: "background.paper",
          zIndex: 100,
          borderRadius: 4,
          width: "auto",
          minWidth: 300,
          justifyContent: "center",
        }}
      >
        <Tooltip title="HotKey: A">
          <Button
            variant="contained"
            color="success"
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
          >
            Одобрить
          </Button>
        </Tooltip>

        <Tooltip title="Отправить на доработку">
          <Button
            variant="contained"
            color="warning"
            onClick={() => handleActionClick("draft")}
            disabled={draftMutation.isPending}
          >
            На доработку
          </Button>
        </Tooltip>

        <Tooltip title="HotKey: D">
          <Button
            variant="contained"
            color="error"
            onClick={() => handleActionClick("reject")}
            disabled={rejectMutation.isPending}
          >
            Отклонить
          </Button>
        </Tooltip>
      </Paper>

      {/* Универсальный диалог */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === "reject"
            ? "Отклонить объявление"
            : "Вернуть на доработку"}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Причина *</InputLabel>
            <Select
              value={reason}
              label="Причина *"
              onChange={(e) => setReason(e.target.value)}
            >
              {REJECTION_REASONS.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Комментарий (опционально)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Отмена</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color={actionType === "reject" ? "error" : "warning"}
            disabled={
              !reason || rejectMutation.isPending || draftMutation.isPending
            }
          >
            {actionType === "reject" ? "Отклонить" : "Вернуть"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: { xs: 90, sm: 90 } }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};
