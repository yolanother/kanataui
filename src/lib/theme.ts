export type Theme = 'light' | 'dark' | 'system';

export function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function getStoredTheme(): Theme {
  return (localStorage.getItem('kanataui-theme') as Theme) ?? 'system';
}

export function storeTheme(theme: Theme): void {
  localStorage.setItem('kanataui-theme', theme);
}
