import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
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
  Button,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  useTheme,
  alpha,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
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

// цветовая палитра
const CHART_COLORS = {
  approved: "#10b981",
  rejected: "#ef4444",
  requestChanges: "#f59e0b",
};

const PIE_COLORS = ["#10b981", "#ef4444", "#f59e0b"];

export const Stats = () => {
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");
  const theme = useTheme();

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

  const handleExportCSV = () => {
    if (!summary) return;
    // Формируем CSV (BOM \uFEFF нужен для корректного отображения кириллицы в Excel)
    const csvContent = [
      ["Metric", "Value"],
      ["Total Reviewed", summary.totalReviewed],
      ["Approved %", summary.approvedPercentage],
      ["Rejected %", summary.rejectedPercentage],
      ["Avg Time (sec)", summary.averageReviewTime],
    ]
      .map((e) => e.join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    saveAs(blob, `stats-${period}.csv`);
  };

  const handleExportPDF = () => {
    if (!summary) return;
    const doc = new jsPDF();

    // Заголовок
    doc.text(`Moderator Stats (${period})`, 14, 22);

    // Таблица
    autoTable(doc, {
      startY: 30,
      head: [["Metric", "Value"]],
      body: [
        ["Total Reviewed", summary.totalReviewed],
        ["Approved", `${summary.approvedPercentage.toFixed(1)}%`],
        ["Rejected", `${summary.rejectedPercentage.toFixed(1)}%`],
        ["Avg Time", `${summary.averageReviewTime} sec`],
      ],
    });

    doc.save(`report-${period}.pdf`);
  };

  const handlePeriodChange = (
    _: React.MouseEvent<HTMLElement>,
    newPeriod: "today" | "week" | "month" | null
  ) => {
    if (newPeriod !== null) {
      setPeriod(newPeriod);
    }
  };

  const isLoading = isSumLoading || isActLoading || isDecLoading;

  // кастомный Tooltip для Bar Chart
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper
          elevation={3}
          sx={{
            p: 1.5,
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
            {payload[0].payload.date}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  // кастомный Tooltip для Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const total = decisions
        ? decisions.approved + decisions.rejected + decisions.requestChanges
        : 0;
      const percentage = ((payload[0].value / total) * 100).toFixed(1);

      return (
        <Paper
          elevation={3}
          sx={{
            p: 1.5,
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="body2" fontWeight="bold">
            {payload[0].name}
          </Typography>
          <Typography variant="body2">
            {payload[0].value} ({percentage}%)
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  // кастомный Label для Pie Chart
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="14"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

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
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography variant="h4" fontWeight="bold">
          Статистика модератора
        </Typography>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={handlePeriodChange}
          aria-label="period"
          size="small"
        >
          <ToggleButton value="today">Сегодня</ToggleButton>
          <ToggleButton value="week">Неделя</ToggleButton>
          <ToggleButton value="month">Месяц</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button startIcon={<DownloadIcon />} onClick={handleExportCSV}>
            CSV
          </Button>
          <Button startIcon={<PictureAsPdfIcon />} onClick={handleExportPDF}>
            PDF
          </Button>
        </Box>
      </Box>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* карточки Summary */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                textAlign: "center",
                height: "100%",
                background: `linear-gradient(135deg, ${alpha(
                  theme.palette.primary.main,
                  0.1
                )} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: theme.shadows[8],
                },
              }}
            >
              <Typography
                variant="h3"
                color="primary"
                fontWeight="bold"
                sx={{ mb: 1 }}
              >
                {summary?.totalReviewed}
              </Typography>
              <Typography color="text.secondary" variant="body1">
                Всего проверено
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                textAlign: "center",
                height: "100%",
                background: `linear-gradient(135deg, ${alpha(
                  "#10b981",
                  0.1
                )} 0%, ${alpha("#10b981", 0.05)} 100%)`,
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: theme.shadows[8],
                },
              }}
            >
              <Typography
                variant="h3"
                sx={{ color: "#10b981", fontWeight: "bold", mb: 1 }}
              >
                {summary?.approvedPercentage.toFixed(1)}%
              </Typography>
              <Typography color="text.secondary" variant="body1">
                Одобрено
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                textAlign: "center",
                height: "100%",
                background: `linear-gradient(135deg, ${alpha(
                  "#ef4444",
                  0.1
                )} 0%, ${alpha("#ef4444", 0.05)} 100%)`,
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: theme.shadows[8],
                },
              }}
            >
              <Typography
                variant="h3"
                sx={{ color: "#ef4444", fontWeight: "bold", mb: 1 }}
              >
                {summary?.rejectedPercentage.toFixed(1)}%
              </Typography>
              <Typography color="text.secondary" variant="body1">
                Отклонено
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                textAlign: "center",
                height: "100%",
                background: `linear-gradient(135deg, ${alpha(
                  theme.palette.info.main,
                  0.1
                )} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: theme.shadows[8],
                },
              }}
            >
              <Typography
                variant="h3"
                color="info.main"
                fontWeight="bold"
                sx={{ mb: 1 }}
              >
                {summary?.averageReviewTime}
              </Typography>
              <Typography color="text.secondary" variant="body1">
                Ср. время (сек)
              </Typography>
            </Paper>
          </Grid>

          {/* график активности */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                height: 450,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Активность по дням
              </Typography>
              <Box sx={{ flexGrow: 1, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={activity}
                    margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={alpha(theme.palette.divider, 0.3)}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: theme.palette.divider }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: theme.palette.divider }}
                    />
                    <Tooltip
                      content={<CustomBarTooltip />}
                      cursor={{ fill: alpha(theme.palette.primary.main, 0.1) }}
                    />
                    <Legend
                      wrapperStyle={{
                        paddingTop: "20px",
                        fontSize: "14px",
                      }}
                      iconType="circle"
                    />
                    <Bar
                      dataKey="approved"
                      name="Одобрено"
                      fill={CHART_COLORS.approved}
                      radius={[8, 8, 0, 0]}
                      animationDuration={800}
                    />
                    <Bar
                      dataKey="rejected"
                      name="Отклонено"
                      fill={CHART_COLORS.rejected}
                      radius={[8, 8, 0, 0]}
                      animationDuration={800}
                    />
                    <Bar
                      dataKey="requestChanges"
                      name="На доработку"
                      fill={CHART_COLORS.requestChanges}
                      radius={[8, 8, 0, 0]}
                      animationDuration={800}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* график решений */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                height: 450,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Распределение решений
              </Typography>
              <Box sx={{ flexGrow: 1, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={100}
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      animationDuration={800}
                      animationBegin={0}
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      wrapperStyle={{
                        fontSize: "14px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};
