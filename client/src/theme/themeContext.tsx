import { createContext, useState, useMemo, useContext, useEffect } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import type { PaletteMode } from "@mui/material";
import type { ReactNode } from "react";

interface ColorModeContextType {
  toggleColorMode: () => void;
  mode: PaletteMode;
}

const ColorModeContext = createContext<ColorModeContextType>({
  toggleColorMode: () => {},
  mode: "light",
});

export const useColorMode = () => useContext(ColorModeContext);

interface ColorModeProviderProps {
  children: ReactNode;
}

export const ColorModeProvider = ({ children }: ColorModeProviderProps) => {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedMode = localStorage.getItem("themeMode");
    return savedMode === "dark" || savedMode === "light" ? savedMode : "light";
  });

  useEffect(() => {
    localStorage.setItem("themeMode", mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
      },
      mode,
    }),
    [mode]
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === "light"
            ? {
                // светлая тема
                primary: { main: "#1d0c62ff" }, // активная страница в хедере
                secondary: { main: "#ff4646" }, // пока ничего
                background: {
                  default: "#fdfeffff", // главный цвет фона
                  paper: "#fdfeffff", // выпадающий список и поле фильров
                },
                text: {
                  primary: "#000000ff", // текст на карточках и в фильтре (без статуса и фильтров "категория" и "статус")
                  secondary: "#000000ff", // текст на карточках и в фильтре (статуса и фильтров "категория" и "статус")
                },
                divider: "#e4f1ffff", // для границ характеристик и таблицы в /item:id
                success: { main: "#029a0cff" },
                error: { main: "#ee2a2aff" },
                warning: { main: "#ffc400ff" },
                info: { main: "#3182ce" },
              }
            : {
                // темная тема
                primary: { main: "#9baac7" }, // активная страница в хедере
                secondary: { main: "#430aac" }, // пока ничего
                background: {
                  default: "#080816", // главный цвет фона
                  paper: "#0e0f15", // выпадающий список
                },
                text: {
                  primary: "#ffffff", // текст на карточках и в фильтре (без статуса и фильтров "категория" и "статус")
                  secondary: "#e2dcdc", // текст на карточках и в фильтре (статуса и фильтров "категория" и "статус")
                },
                divider: "#4a5568", // для границ характеристик и таблицы в /item:id
                success: { main: "#0e6432ff" },
                error: { main: "#5c1414ff" },
                warning: { main: "#876e14ff" },
                info: { main: "#2182d1ff" },
              }),
        },
        components: {
          // глобальные стили для компонентов
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                scrollbarColor:
                  mode === "dark" ? "#6b6b6b #2b2b2b" : "#959595 #f5f5f5",
                "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
                  backgroundColor: mode === "dark" ? "#2b2b2b" : "#f5f5f5",
                },
                "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
                  borderRadius: 8,
                  backgroundColor: mode === "dark" ? "#6b6b6b" : "#959595",
                  minHeight: 24,
                  border:
                    mode === "dark" ? "3px solid #2b2b2b" : "3px solid #f5f5f5",
                },
              },
            },
          },
          // карточки
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundColor: mode === "light" ? "#fdfeffff" : "#1e1e1e",
                border: `1px solid ${mode === "light" ? "#e2cbd1" : "#4a5568"}`,
              },
            },
          },
          // хедер
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: mode === "light" ? "#f6fbffff" : "#070712",
                color: mode === "light" ? "#070712" : "#9baac7",
                boxShadow: "none",
                borderBottom: `1px solid ${
                  mode === "light" ? "#120202" : "#4a5568"
                }`,
              },
            },
          },
          // кнопоки
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: "none", // убираем капс
                fontWeight: 600,
              },
              contained: {
                boxShadow: "none",
              },
            },
          },
          // инпуты (чтобы фон был не прозрачный, а соответствовал теме)
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                backgroundColor: mode === "light" ? "#ffffff" : "#1a1a2e",
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              // чтобы выпадающие списки и диалоги тоже были правильного цвета
              root: {
                backgroundImage: "none", //убираем осветление в темной теме MUI по умолчанию
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};
