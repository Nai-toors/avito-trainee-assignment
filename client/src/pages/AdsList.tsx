import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAds } from '../api/api';
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
  Stack
} from '@mui/material';
import Grid from '@mui/material/Grid2'; 
import { Link } from 'react-router-dom';

const CATEGORIES = [
  { id: 0, name: 'Электроника' },
  { id: 1, name: 'Недвижимость' },
  { id: 2, name: 'Транспорт' },
  { id: 3, name: 'Работа' },
  { id: 4, name: 'Услуги' },
  { id: 5, name: 'Животные' },
  { id: 6, name: 'Мода' },
  { id: 7, name: 'Детское' },
];

export const AdsList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ads', page, search, category, status],
    queryFn: () => fetchAds({ 
      page, 
      limit: 10, 
      search, 
      categoryId: category ? Number(category) : undefined,
      status: status || undefined 
    }),
  });

  if (isLoading) return (
    <Container sx={{ mt: 4, textAlign: 'center' }}>
      <Typography>Загрузка объявлений...</Typography>
    </Container>
  );

  if (isError) return (
    <Container sx={{ mt: 4, textAlign: 'center' }}>
      <Typography color="error">Произошла ошибка при загрузке данных.</Typography>
      <Typography variant="body2">Проверьте, запущен ли сервер на порту 3001.</Typography>
    </Container>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Модерация объявлений
      </Typography>
      
      <Box sx={{ mb: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField 
              fullWidth 
              label="Поиск по названию" 
              variant="outlined"
              value={search} 
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1); 
              }} 
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Категория</InputLabel>
              <Select
                value={category}
                label="Категория"
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value=""><em>Все категории</em></MenuItem>
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                value={status}
                label="Статус"
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value=""><em>Все статусы</em></MenuItem>
                <MenuItem value="pending">На модерации</MenuItem>
                <MenuItem value="approved">Одобрено</MenuItem>
                <MenuItem value="rejected">Отклонено</MenuItem>
                <MenuItem value="draft">Черновик</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={3}>
        {data?.ads.map((ad) => (
          <Grid key={ad.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardMedia
                component="img"
                height="140"
                image={ad.images[0] || 'https://via.placeholder.com/300'}
                alt={ad.title}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip 
                    label={ad.status} 
                    size="small"
                    color={
                      ad.status === 'approved' ? 'success' : 
                      ad.status === 'rejected' ? 'error' : 
                      'warning'
                    } 
                  />
                  <Typography variant="subtitle1" fontWeight="bold">
                    {ad.price.toLocaleString()} ₽
                  </Typography>
                </Box>
                <Typography variant="h6" component="div" noWrap title={ad.title}>
                  {ad.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {ad.category}
                </Typography>
                <Button 
                  component={Link} 
                  to={`/item/${ad.id}`} 
                  variant="contained" 
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Проверить
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {data && data.pagination.totalPages > 1 && (
        <Stack spacing={2} sx={{ mt: 4, alignItems: 'center' }}>
          <Pagination 
            count={data.pagination.totalPages} 
            page={page} 
            onChange={(_, val) => setPage(val)} 
            color="primary"
          />
        </Stack>
      )}
      
      {data?.ads.length === 0 && (
        <Typography variant="h6" align="center" sx={{ mt: 4 }}>
          Объявлений не найдено
        </Typography>
      )}
    </Container>
  );
};