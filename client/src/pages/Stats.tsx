import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  fetchStats,
  fetchStatsActivity,
  fetchStatsDecisions,
} from "../api/api";
import {
  Container,
  Typography,
  Paper,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from "@mui/material";
import Grid from "@mui/material/Grid2"; // Используем Grid2 (как в AdsList)
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];

export const Stats = () => {
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");

  // Запросы к API
  const { data: summary, isLoading: isSumLoading } = useQuery({
    queryKey: ["stats", "summary", period],
    queryFn: () => fetchStats(period),
  });

  const { data: activity, isLoading: isActLoading } = useQuery({
    queryKey: ["stats", "activity", period],
    queryFn: () => fetchStatsActivity(period),
  });

  const { data: decisions, isLoading: isDecLoading } = useQuery({
    queryKey: ["stats", "decisions", period],
    queryFn: () => fetchStatsDecisions(period),
  });

  // Обработчик переключения периода
  const handlePeriodChange = (
    _: React.MouseEvent<HTMLElement>,
    newPeriod: "today" | "week" | "month" | null
  ) => {
    if (newPeriod !== null) {
      setPeriod(newPeriod);
    }
  };

  const isLoading = isSumLoading || isActLoading || isDecLoading;

  // Подготовка данных для круговой диаграммы
  const pieData = decisions
    ? [
        { name: "Одобрено", value: decisions.approved },
        { name: "Отклонено", value: decisions.rejected },
        { name: "На доработку", value: decisions.requestChanges },
      ]
    : [];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4">Статистика модератора</Typography>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={handlePeriodChange}
          aria-label="period"
        >
          <ToggleButton value="today">Сегодня</ToggleButton>
          <ToggleButton value="week">Неделя</ToggleButton>
          <ToggleButton value="month">Месяц</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* --- Карточки Summary --- */}

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", height: "100%" }}>
              <Typography variant="h4" color="primary">
                {summary?.totalReviewed}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Всего проверено
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", height: "100%" }}>
              <Typography variant="h4" color="success.main">
                {summary?.approvedPercentage.toFixed(1)}%
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Одобрено
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", height: "100%" }}>
              <Typography variant="h4" color="error.main">
                {summary?.rejectedPercentage.toFixed(1)}%
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Отклонено
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: "center", height: "100%" }}>
              <Typography variant="h4">
                {summary?.averageReviewTime} сек
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Ср. время проверки
              </Typography>
            </Paper>
          </Grid>

          {/* --- График активности (Bar Chart) --- */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 2, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Активность
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="approved" name="Одобрено" fill="#4caf50" />
                  <Bar dataKey="rejected" name="Отклонено" fill="#f44336" />
                  <Bar
                    dataKey="requestChanges"
                    name="На доработку"
                    fill="#ff9800"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* --- График решений (Pie Chart) --- */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Решения
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};
