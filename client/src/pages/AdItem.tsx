import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdById, api } from '../api/api';
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
  Snackbar
} from '@mui/material';

const REJECTION_REASONS = [
  'Запрещенный товар',
  'Неверная категория',
  'Некорректное описание',
  'Проблемы с фото',
  'Подозрение на мошенничество',
  'Другое'
];

export const AdItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionComment, setRejectionComment] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const { data: ad, isLoading, isError } = useQuery({
    queryKey: ['ad', id],
    queryFn: () => fetchAdById(id!),
  });

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // Мутация для одобрения
  const approveMutation = useMutation({
    mutationFn: () => api.post(`/ads/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad', id] });
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      showSnackbar('Объявление одобрено!', 'success');
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка при одобрении объявления';
      showSnackbar(message, 'error');
    }
  });

  // Мутация для отклонения
  const rejectMutation = useMutation({
    mutationFn: (data: { reason: string; comment?: string }) => 
      api.post(`/ads/${id}/reject`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad', id] });
      queryClient.invalidateQueries({ queryKey: ['ads'] });
      setRejectDialogOpen(false);
      setRejectionReason('');
      setRejectionComment('');
      showSnackbar('Объявление отклонено!', 'success');
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Ошибка при отклонении объявления';
      showSnackbar(message, 'error');
    }
  });

  const handleRejectClick = () => {
    setRejectDialogOpen(true);
  };

  const handleRejectSubmit = () => {
    if (!rejectionReason) {
      showSnackbar('Необходимо указать причину отклонения', 'error');
      return;
    }
    rejectMutation.mutate({
      reason: rejectionReason,
      comment: rejectionComment || undefined
    });
  };

  if (isLoading) return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography>Загрузка...</Typography>
    </Container>
  );

  if (isError || !ad) return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Alert severity="error">Ошибка при загрузке объявления</Alert>
      <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>Назад</Button>
    </Container>
  );

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Button onClick={() => navigate(-1)}>Назад</Button>
      
      <Typography variant="h4" sx={{ mt: 2 }}>{ad.title}</Typography>
      <Chip 
        label={ad.status} 
        color={
          ad.status === 'approved' ? 'success' : 
          ad.status === 'rejected' ? 'error' : 
          'warning'
        } 
        sx={{ mt: 1 }}
      />

      {/* Галерея изображений */}
      <Box sx={{ mt: 2 }}>
        {/* Большая картинка (используем состояние activeImage, которое добавим ниже) */}
        <Box 
          component="img" 
          src={ad.images[activeImage]} 
          alt="Main" 
          sx={{ 
            width: '100%', 
            maxHeight: 500, 
            objectFit: 'contain', 
            borderRadius: 2,
            bgcolor: '#f0f0f0'
          }} 
        />
        
        {/* Миниатюры */}
        <Box sx={{ display: 'flex', gap: 1, mt: 1, overflowX: 'auto' }}>
          {ad.images.map((img, index) => (
            <Box 
              key={index}
              component="img"
              src={img}
              onClick={() => setActiveImage(index)}
              sx={{ 
                width: 80, 
                height: 80, 
                objectFit: 'cover', 
                borderRadius: 1,
                cursor: 'pointer',
                border: activeImage === index ? '2px solid #1976d2' : '2px solid transparent'
              }} 
            />
          ))}
        </Box>
      </Box>

      <Typography variant="h5" sx={{ mt: 2 }}>{ad.price.toLocaleString()} ₽</Typography>
      <Typography variant="body1" sx={{ mt: 2 }}>{ad.description}</Typography>

      {/* Панель модератора */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
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
          color="error"
          onClick={handleRejectClick}
          disabled={rejectMutation.isPending}
        >
          Отклонить
        </Button>
      </Box>

      {/* Диалог отклонения */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
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
                <MenuItem key={reason} value={reason}>{reason}</MenuItem>
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

      {/* Уведомления */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};