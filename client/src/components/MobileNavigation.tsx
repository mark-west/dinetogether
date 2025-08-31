import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function MobileNavigation() {
  const [location] = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: 'fas fa-home' },
    { path: '/groups', label: 'Groups', icon: 'fas fa-users' },
    { path: '/events', label: 'Events', icon: 'fas fa-calendar' },
    { path: '/chat', label: 'Chat', icon: 'fas fa-comments' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around p-2">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            className={`flex flex-col items-center gap-1 p-2 h-auto min-h-[44px] ${
              location === item.path ? 'text-primary' : 'text-muted-foreground'
            }`}
            onClick={() => window.location.href = item.path}
            data-testid={`mobile-nav-${item.label.toLowerCase()}`}
          >
            <i className={`${item.icon} text-lg`}></i>
            <span className="text-xs font-medium">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
