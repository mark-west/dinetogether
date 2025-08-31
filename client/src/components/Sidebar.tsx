import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import type { Group } from "@shared/schema";
import logoImage from "@assets/fulllogo_1756644214427.jpg";

export default function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();
  
  const { data: groups } = useQuery<Array<Group & { memberCount: number; role: string }>>({
    queryKey: ["/api/groups"],
    retry: false,
  });

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'fas fa-home' },
    { path: '/groups', label: 'My Groups', icon: 'fas fa-users' },
    { path: '/events', label: 'Events', icon: 'fas fa-calendar' },
    { path: '/chat', label: 'Messages', icon: 'fas fa-comments' },
  ];

  return (
    <div className="hidden md:block bg-card border-r border-border h-screen sticky top-0 w-80">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="mb-4 w-full aspect-square">
          <img 
            src={logoImage} 
            alt="Dine Together" 
            className="w-full h-full rounded-lg object-cover cursor-pointer"
            data-testid="img-sidebar-logo"
            onClick={() => window.location.href = '/'}
          />
        </div>
        
        {/* User Profile */}
        <div 
          className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-hover transition-colors"
          onClick={() => window.location.href = '/profile'}
          data-testid="button-profile"
        >
          {(user as any)?.profileImageUrl ? (
            <img 
              src={(user as any).profileImageUrl} 
              alt="User avatar" 
              className="w-10 h-10 rounded-full object-cover"
              data-testid="img-user-avatar"
            />
          ) : (
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium">
              {((user as any)?.firstName?.[0] || (user as any)?.email?.[0] || '?').toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" data-testid="text-user-name">
              {(user as any)?.firstName && (user as any)?.lastName 
                ? `${(user as any).firstName} ${(user as any).lastName}`
                : (user as any)?.email || 'User'
              }
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
              {(user as any)?.email}
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant={location === item.path ? "default" : "ghost"}
            className="w-full justify-start hover:bg-hover"
            onClick={() => window.location.href = item.path}
            data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
          >
            <i className={`${item.icon} text-sm mr-3`}></i>
            <span>{item.label}</span>
          </Button>
        ))}
      </nav>
      
      {/* Recent Groups */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm text-muted-foreground">Recent Groups</h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.location.href = '/groups'}
            data-testid="button-add-group"
          >
            <i className="fas fa-plus text-sm"></i>
          </Button>
        </div>
        
        <div className="space-y-2">
          {groups?.slice(0, 3).map((group: any) => (
            <div 
              key={group.id} 
              className="flex items-center gap-3 p-2 hover:bg-hover rounded-lg transition-colors cursor-pointer"
              onClick={() => window.location.href = `/groups/${group.id}`}
              data-testid={`sidebar-group-${group.id}`}
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-xs font-medium">
                {group.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" data-testid={`text-sidebar-group-name-${group.id}`}>
                  {group.name}
                </p>
                <p className="text-xs text-muted-foreground" data-testid={`text-sidebar-group-members-${group.id}`}>
                  {group.memberCount} members
                </p>
              </div>
            </div>
          )) || (
            <p className="text-xs text-muted-foreground text-center py-2">No groups yet</p>
          )}
        </div>
      </div>
      
      {/* Logout */}
      <div className="p-4 border-t border-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-hover"
          onClick={() => window.location.href = '/api/logout'}
          data-testid="button-logout"
        >
          <i className="fas fa-sign-out-alt text-sm mr-3"></i>
          <span>Log Out</span>
        </Button>
      </div>
    </div>
  );
}
