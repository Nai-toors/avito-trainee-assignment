import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "@mui/material";

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
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionComment, setRejectionComment] = useState("");
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

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  // мутация для одобрения
  const approveMutation = useMutation({
    mutationFn: () => api.post(`/ads/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad", id] });
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      showSnackbar("Объявление одобрено!", "success");
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Ошибка при одобрении объявления";
      showSnackbar(message, "error");
    },
  });

  // мутация для отклонения
  const rejectMutation = useMutation({
    mutationFn: (data: { reason: string; comment?: string }) =>
      api.post(`/ads/${id}/reject`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad", id] });
      queryClient.invalidateQueries({ queryKey: ["ads"] });
      setRejectDialogOpen(false);
      setRejectionReason("");
      setRejectionComment("");
      showSnackbar("Объявление отклонено!", "success");
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Ошибка при отклонении объявления";
      showSnackbar(message, "error");
    },
  });

  // мутация "Вернуть на доработку" (draft)
  const draftMutation = useMutation({
    mutationFn: () =>
      api.post(`/ads/${id}/request-changes`, {
        reason: rejectionReason || "Другое", // сервер требует причину отклонения
        comment: rejectionComment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad", id] });
      showSnackbar("Отправлено на доработку", "success");
    },
  });

  const handleRejectClick = () => {
    setRejectDialogOpen(true);
  };

  const handleRejectSubmit = () => {
    if (!rejectionReason) {
      showSnackbar("Необходимо указать причину отклонения", "error");
      return;
    }
    rejectMutation.mutate({
      reason: rejectionReason,
      comment: rejectionComment || undefined,
    });
  };

  if (isLoading)
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography>Загрузка...</Typography>
      </Container>
    );

  if (isError || !ad)
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Ошибка при загрузке объявления</Alert>
        <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Назад
        </Button>
      </Container>
    );

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Button onClick={() => navigate(-1)}>Назад</Button>

      {/* заголовок и статус */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mt: 2,
        }}
      >
        <Typography variant="h4">{ad.title}</Typography>
        <Chip label={ad.status} color={/* ... цвета ... */ "default"} />
      </Box>
      <Typography variant="subtitle1" color="text.secondary">
        ID: {ad.id} | Дата: {new Date(ad.createdAt).toLocaleString()}
      </Typography>

      {/* галерея */}
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
          }}
        />
        <Box sx={{ display: "flex", gap: 1, mt: 1, overflowX: "auto" }}>
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
              }}
            />
          ))}
        </Box>
      </Box>

      <Typography variant="h5" sx={{ mt: 2, fontWeight: "bold" }}>
        {ad.price.toLocaleString()} ₽
      </Typography>

      {/* продавец */}
      <Paper
        sx={{ p: 2, mt: 2, display: "flex", alignItems: "center", gap: 2 }}
      >
        <Avatar>{ad.seller.name[0]}</Avatar>
        <Box>
          <Typography variant="subtitle1">{ad.seller.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            Рейтинг: {ad.seller.rating} • В сети с{" "}
            {new Date(ad.seller.registeredAt).toLocaleDateString()}
          </Typography>
        </Box>
      </Paper>

      {/* описание */}
      <Typography variant="h6" sx={{ mt: 3 }}>
        Описание
      </Typography>
      <Typography variant="body1">{ad.description}</Typography>

      {/* характеристики */}
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

      {/* история модерации */}
      {ad.moderationHistory.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mt: 3 }}>
            История модерации
          </Typography>
          <List dense>
            {ad.moderationHistory.map((item, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={`${item.action} — ${item.moderatorName}`}
                  secondary={`${new Date(item.timestamp).toLocaleString()} ${
                    item.comment ? `— ${item.comment}` : ""
                  }`}
                />
              </ListItem>
            ))}
          </List>
        </>
      )}

      <Divider sx={{ my: 3 }} />

      {/* панель действий */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          p: 2,
          border: "1px solid #ccc",
          borderRadius: 2,
          position: "sticky",
          bottom: 20,
          bgcolor: "background.paper",
          zIndex: 10,
        }}
      >
        <Button
          variant="contained"
          color="success"
          onClick={() => approveMutation.mutate()}
          disabled={approveMutation.isPending}
        >
          Одобрить
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={() => draftMutation.mutate()}
          disabled={draftMutation.isPending}
        >
          На доработку
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleRejectClick}
          disabled={rejectMutation.isPending}
        >
          Отклонить
        </Button>
      </Box>

      {/* диалог отклонения */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Отклонить объявление</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Причина отклонения *</InputLabel>
            <Select
              value={rejectionReason}
              label="Причина отклонения *"
              onChange={(e) => setRejectionReason(e.target.value)}
            >
              {REJECTION_REASONS.map((reason) => (
                <MenuItem key={reason} value={reason}>
                  {reason}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Комментарий (необязательно)"
            value={rejectionComment}
            onChange={(e) => setRejectionComment(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleRejectSubmit}
            variant="contained"
            color="error"
            disabled={!rejectionReason || rejectMutation.isPending}
          >
            Отклонить
          </Button>
        </DialogActions>
      </Dialog>

      {/* уведомления */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
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
