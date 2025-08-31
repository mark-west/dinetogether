import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoadingNavigation } from "@/hooks/useLoadingNavigation";

export default function Landing() {
  const { navigateWithLoading, isLoading } = useLoadingNavigation();
  
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-8 pt-12">
          {/* Large prominent logo */}
          <div className="w-32 h-32 gradient-bg rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl ring-4 ring-white/20">
            <i className="fas fa-utensils text-white text-6xl"></i>
          </div>
          
          {/* Brand name with elegant typography */}
          <CardTitle className="text-5xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-4 tracking-tight">
            DineTogether
          </CardTitle>
          
          {/* Elegant tagline */}
          <CardDescription className="text-xl text-muted-foreground leading-relaxed max-w-md mx-auto">
            Where every meal becomes a memorable gathering with friends
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 px-8 pb-12">
          {/* Enhanced feature highlights */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <i className="fas fa-users text-white text-lg"></i>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Private Groups</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Create invite-only dining circles</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <i className="fas fa-calendar text-white text-lg"></i>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Smart Planning</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Coordinate events with easy RSVP</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <i className="fas fa-comments text-white text-lg"></i>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Live Chat</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Share ideas and restaurant picks</div>
              </div>
            </div>
          </div>
          
          {/* Enhanced login buttons */}
          <div className="space-y-4">
            <Button 
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transition-all duration-200" 
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
              className="w-full h-11 text-base border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200" 
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
