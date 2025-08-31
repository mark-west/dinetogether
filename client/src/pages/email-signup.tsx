import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/fulllogo_1756675026225.png";

const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignUpData = z.infer<typeof signUpSchema>;
type SignInData = z.infer<typeof signInSchema>;

type AuthState = 'signin' | 'signup' | 'verification-sent' | 'verifying';

export default function EmailSignup() {
  const { toast } = useToast();
  const [authState, setAuthState] = useState<AuthState>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const signUpForm = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
    },
  });

  const signInForm = useForm<SignInData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSignUp = async (data: SignUpData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/email/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          password: data.password,
        }),
      });

      if (response.ok) {
        setUserEmail(data.email);
        setAuthState('verification-sent');
        toast({
          title: "Verification Email Sent!",
          description: `Please check ${data.email} and click the verification link.`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Signup Failed",
          description: error.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSignIn = async (data: SignInData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/email/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      if (response.ok) {
        toast({
          title: "Welcome Back!",
          description: "You're now signed in to DineTogether.",
        });
        window.location.href = "/";
      } else {
        const error = await response.json();
        toast({
          title: "Sign In Failed",
          description: error.message || "Invalid email or password.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/email/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userEmail }),
      });

      if (response.ok) {
        toast({
          title: "Verification Email Resent",
          description: "Please check your email for the new verification link.",
        });
      } else {
        toast({
          title: "Failed to Resend",
          description: "Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          
          {authState === 'verification-sent' ? (
            <>
              <CardTitle className="text-xl font-semibold">Check Your Email</CardTitle>
              <CardDescription>
                We've sent a verification link to {userEmail}
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-xl font-semibold">
                {authState === 'signin' ? 'Welcome Back' : 'Create Account'}
              </CardTitle>
              <CardDescription>
                {authState === 'signin' 
                  ? 'Sign in to your DineTogether account' 
                  : 'Join DineTogether to start coordinating dining events'
                }
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          {authState === 'verification-sent' ? (
            <div className="space-y-6 text-center">
              <div className="space-y-3">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <i className="fas fa-envelope text-2xl text-primary"></i>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Please check your email and click the verification link to complete your account setup.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The link will expire in 24 hours for security.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={resendVerification}
                  variant="outline"
                  disabled={isLoading}
                  className="w-full"
                  data-testid="button-resend-verification"
                >
                  {isLoading ? "Sending..." : "Resend Verification Email"}
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={() => setAuthState('signup')}
                  className="w-full"
                  data-testid="button-back-to-signup"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Back to Sign Up
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Toggle between Sign In and Sign Up */}
              <div className="flex bg-muted rounded-lg p-1 mb-6">
                <Button
                  variant={authState === 'signin' ? 'default' : 'ghost'}
                  onClick={() => setAuthState('signin')}
                  className="flex-1 h-8"
                  data-testid="tab-signin"
                >
                  Sign In
                </Button>
                <Button
                  variant={authState === 'signup' ? 'default' : 'ghost'}
                  onClick={() => setAuthState('signup')}
                  className="flex-1 h-8"
                  data-testid="tab-signup"
                >
                  Sign Up
                </Button>
              </div>

              {authState === 'signin' ? (
                <Form {...signInForm}>
                  <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                    <FormField
                      control={signInForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="john@example.com" 
                              {...field} 
                              data-testid="input-signin-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signInForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter your password" 
                              {...field} 
                              data-testid="input-signin-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full h-11 text-base font-semibold" 
                      disabled={isLoading}
                      data-testid="button-signin"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                          Signing In...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-sign-in-alt mr-2"></i>
                          Sign In
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...signUpForm}>
                  <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={signUpForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="John" 
                                {...field} 
                                data-testid="input-first-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signUpForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Doe" 
                                {...field} 
                                data-testid="input-last-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={signUpForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="john@example.com" 
                              {...field} 
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="At least 6 characters" 
                              {...field} 
                              data-testid="input-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={signUpForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Repeat your password" 
                              {...field} 
                              data-testid="input-confirm-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full h-11 text-base font-semibold" 
                      disabled={isLoading}
                      data-testid="button-create-account"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-user-plus mr-2"></i>
                          Create Account
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      We'll send you a verification email to confirm your account
                    </p>
                  </form>
                </Form>
              )}

              <div className="text-center mt-6">
                <Button 
                  variant="ghost" 
                  onClick={() => window.location.href = '/login'}
                  data-testid="button-back-to-login"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Back to Login Options
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}