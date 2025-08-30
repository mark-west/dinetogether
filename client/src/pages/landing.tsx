import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 gradient-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-utensils text-white text-2xl"></i>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to DineSync</CardTitle>
          <CardDescription>
            Organize restaurant nights with friends. Create groups, plan events, and chat about your dining adventures.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <i className="fas fa-users text-primary"></i>
              <span>Create invite-only groups with friends</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <i className="fas fa-calendar text-primary"></i>
              <span>Plan restaurant events with RSVP</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <i className="fas fa-comments text-primary"></i>
              <span>Chat and suggest restaurants</span>
            </div>
          </div>
          
          <Button 
            className="w-full" 
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
          >
            Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
