import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoadingNavigation } from "@/hooks/useLoadingNavigation";

export default function Landing() {
  const { navigateWithLoading, isLoading } = useLoadingNavigation();
  
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl border-0">
        <CardHeader className="text-center pb-8 pt-12">
          {/* Your actual DineTogether logo */}
          <div className="mx-auto mb-8">
            <img 
              src="/attached_assets/fulllogo_1756675026225.png" 
              alt="DineTogether Logo" 
              className="w-48 h-48 mx-auto object-contain"
            />
          </div>
          
          {/* Tagline from your logo */}
          <CardDescription className="text-xl text-muted-foreground leading-relaxed max-w-md mx-auto font-medium">
            GATHER. FEAST. REPEAT.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 px-8 pb-12">
          {/* Feature highlights using consistent site colors */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <i className="fas fa-users text-primary-foreground text-lg"></i>
              </div>
              <div>
                <div className="font-medium">Private Groups</div>
                <div className="text-sm text-muted-foreground">Create invite-only dining circles</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                <i className="fas fa-calendar text-secondary-foreground text-lg"></i>
              </div>
              <div>
                <div className="font-medium">Smart Planning</div>
                <div className="text-sm text-muted-foreground">Coordinate events with easy RSVP</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                <i className="fas fa-comments text-accent-foreground text-lg"></i>
              </div>
              <div>
                <div className="font-medium">Live Chat</div>
                <div className="text-sm text-muted-foreground">Share ideas and restaurant picks</div>
              </div>
            </div>
          </div>
          
          {/* Enhanced login buttons using site's existing primary colors */}
          <div className="space-y-4">
            <Button 
              className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200" 
              onClick={() => navigateWithLoading('/api/login')}
              disabled={isLoading('/api/login')}
              data-testid="button-login"
            >
              {isLoading('/api/login') ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full mr-3"></div>
                  Getting Started...
                </>
              ) : (
                <>
                  <i className="fas fa-rocket mr-3 text-lg"></i>
                  Get Started
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              className="w-full h-11 text-base transition-colors duration-200" 
              onClick={() => navigateWithLoading('/api/login?force=true')}
              disabled={isLoading('/api/login?force=true')}
              data-testid="button-login-different-user"
            >
              {isLoading('/api/login?force=true') ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-gray-700 rounded-full mr-3"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus mr-3"></i>
                  Sign in as different user
                </>
              )}
            </Button>
            
            {/* Trust indicator */}
            <div className="text-center pt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                🔒 Secure sign-in powered by Replit
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
