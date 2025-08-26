import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="w-9 h-9 px-0 transition-all duration-300 hover:scale-105"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 transition-all" />
      ) : (
        <Moon className="w-4 h-4 transition-all" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}