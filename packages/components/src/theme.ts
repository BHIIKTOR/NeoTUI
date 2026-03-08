export type ComponentTone = "default" | "accent" | "info" | "success" | "danger";

export interface ComponentTheme {
  fg: string;
  muted: string;
  surfaceBg: string;
  surfaceAltBg: string;
  border: string;
  borderStrong: string;
  title: string;
  accent: string;
  info: string;
  success: string;
  danger: string;
  ink: string;
}

export const defaultComponentTheme: ComponentTheme = {
  fg: "#f2e7d5",
  muted: "#c4b39d",
  surfaceBg: "#1d1916",
  surfaceAltBg: "#26201c",
  border: "#8e7457",
  borderStrong: "#e7c77b",
  title: "#f1cb84",
  accent: "#88c1ab",
  info: "#6caee8",
  success: "#9ac77f",
  danger: "#d98278",
  ink: "#15110d",
};

export function resolveToneColor(
  tone: ComponentTone,
  theme: ComponentTheme = defaultComponentTheme,
): string {
  switch (tone) {
    case "accent":
      return theme.accent;
    case "info":
      return theme.info;
    case "success":
      return theme.success;
    case "danger":
      return theme.danger;
    default:
      return theme.border;
  }
}
