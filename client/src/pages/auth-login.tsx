import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import logoImage from "@assets/fulllogo_1756675026225.png";

export default function AuthLogin() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-2">
      <Card className="w-full max-w-lg shadow-2xl border-0">
        <CardHeader className="text-center pb-3 pt-0">
          <div className="mx-auto mb-3 bg-white rounded-lg p-3">
            <img 
              src={logoImage} 
              alt="DineTogether Logo" 
              className="w-full h-auto max-w-full object-contain"
            />
          </div>
          <CardTitle className="text-xl font-semibold">Choose Your Login Method</CardTitle>
          <CardDescription>Select how you'd like to sign in to DineTogether</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-8 pb-8">
          {/* Social Login Options */}
          <div className="space-y-3">
            <Button 
              className="w-full h-11 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300" 
              onClick={() => window.location.href = '/api/auth/google'}
              data-testid="button-login-google"
            >
              <i className="fab fa-google mr-3 text-red-500"></i>
              Continue with Google
            </Button>

            <Button 
              className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white" 
              onClick={() => window.location.href = '/api/auth/github'}
              data-testid="button-login-github"
            >
              <i className="fab fa-github mr-3"></i>
              Continue with GitHub
            </Button>

            <Button 
              className="w-full h-11 bg-black hover:bg-gray-900 text-white" 
              onClick={() => window.location.href = '/api/auth/apple'}
              data-testid="button-login-apple"
            >
              <i className="fab fa-apple mr-3"></i>
              Continue with Apple
            </Button>

            <Button 
              className="w-full h-11 bg-blue-500 hover:bg-blue-600 text-white" 
              onClick={() => window.location.href = '/api/auth/twitter'}
              data-testid="button-login-twitter"
            >
              <i className="fab fa-twitter mr-3"></i>
              Continue with X
            </Button>
          </div>

          <Separator className="my-6" />

          {/* Email Login Option */}
          <div className="space-y-3">
            <Button 
              className="w-full h-11" 
              variant="outline"
              onClick={() => window.location.href = '/api/auth/email'}
              data-testid="button-login-email"
            >
              <i className="fas fa-envelope mr-3"></i>
              Continue with Email
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground px-4 mt-6">
            Choose your preferred sign-in method to access DineTogether
          </div>
        </CardContent>
      </Card>
    </div>
  );
}