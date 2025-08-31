import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoadingNavigation } from "@/hooks/useLoadingNavigation";
import logoImage from "@assets/fulllogo_1756675026225.png";

export default function Landing() {
  const { navigateWithLoading, isLoading } = useLoadingNavigation();
  
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-2">
      <Card className="w-full max-w-lg shadow-2xl border-0">
        <CardHeader className="text-center pb-3 pt-0">
          {/* Your actual DineTogether logo - large as content width */}
          <div className="mx-auto mb-3 bg-white rounded-lg p-3">
            <img 
              src={logoImage} 
              alt="DineTogether Logo" 
              className="w-full h-auto max-w-full object-contain"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6 px-8 pb-8">
          {/* Feature highlights using consistent site colors */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <i className="fas fa-users text-primary-foreground text-sm"></i>
              </div>
              <div>
                <div className="text-sm font-medium">Private Groups</div>
                <div className="text-xs text-muted-foreground">Create invite-only dining circles</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <i className="fas fa-calendar text-secondary-foreground text-sm"></i>
              </div>
              <div>
                <div className="text-sm font-medium">Smart Planning</div>
                <div className="text-xs text-muted-foreground">Coordinate events with easy RSVP</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <i className="fas fa-comments text-accent-foreground text-sm"></i>
              </div>
              <div>
                <div className="text-sm font-medium">Live Chat</div>
                <div className="text-xs text-muted-foreground">Share ideas and restaurant picks</div>
              </div>
            </div>
          </div>
          
          {/* Single login button with clear messaging */}
          <div className="space-y-4">
            <Button 
              className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200" 
              onClick={() => navigateWithLoading('/api/login')}
              disabled={isLoading('/api/login')}
              data-testid="button-login"
            >
              {isLoading('/api/login') ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <i className="fas fa-utensils mr-2 text-base"></i>
                  Start Dining Together
                </>
              )}
            </Button>
            
            {/* Clear messaging about authentication options */}
            <div className="text-center text-xs text-muted-foreground px-4">
              Sign in with Replit • Create account • Use Google, GitHub & more
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
