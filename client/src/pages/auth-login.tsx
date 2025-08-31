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
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white" 
              onClick={() => window.location.href = '/api/auth/facebook'}
              data-testid="button-login-facebook"
            >
              <i className="fab fa-facebook mr-3"></i>
              Continue with Facebook
            </Button>

            <Button 
              className="w-full h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white" 
              onClick={() => window.location.href = '/api/auth/instagram'}
              data-testid="button-login-instagram"
            >
              <i className="fab fa-instagram mr-3"></i>
              Continue with Instagram
            </Button>

            <Button 
              className="w-full h-11 bg-black hover:bg-gray-900 text-white" 
              onClick={() => window.location.href = '/api/auth/apple'}
              data-testid="button-login-apple"
            >
              <i className="fab fa-apple mr-3"></i>
              Continue with Apple
            </Button>
          </div>

          <Separator className="my-6" />

          {/* Email Login Option */}
          <div className="space-y-3">
            <Button 
              className="w-full h-11" 
              variant="outline"
              onClick={() => window.location.href = '/email-signup'}
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