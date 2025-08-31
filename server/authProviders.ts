import passport from "passport";
import { storage } from "./storage";
import { sendVerificationEmail, verifyEmailToken, findUserByEmailAndPassword } from "./emailVerification";
import type { Express } from "express";

// Mock social auth providers for development
// In production, these would be configured with real OAuth credentials
export async function setupSocialAuth(app: Express) {
  // Serialize/deserialize user for sessions
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());

  // Social login routes - these will allow different users
  app.get("/api/auth/google", (req, res) => {
    // For demo purposes, create different users based on the provider
    const googleUser = {
      id: "google-user-" + Date.now(),
      email: "google.user@example.com",
      firstName: "Google",
      lastName: "User",
      profileImageUrl: null,
    };
    
    (req.session as any).user = googleUser;
    res.redirect("/");
  });

  app.get("/api/auth/facebook", (req, res) => {
    const facebookUser = {
      id: "facebook-user-" + Date.now(),
      email: "facebook.user@example.com", 
      firstName: "Facebook",
      lastName: "User",
      profileImageUrl: null,
    };
    
    (req.session as any).user = facebookUser;
    res.redirect("/");
  });

  app.get("/api/auth/instagram", (req, res) => {
    const instagramUser = {
      id: "instagram-user-" + Date.now(),
      email: "instagram.user@example.com",
      firstName: "Instagram", 
      lastName: "User",
      profileImageUrl: null,
    };
    
    (req.session as any).user = instagramUser;
    res.redirect("/");
  });

  app.get("/api/auth/apple", (req, res) => {
    const appleUser = {
      id: "apple-user-" + Date.now(),
      email: "apple.user@example.com",
      firstName: "Apple", 
      lastName: "User",
      profileImageUrl: null,
    };
    
    (req.session as any).user = appleUser;
    res.redirect("/");
  });

  // Email authentication endpoints
  app.post("/api/auth/email/signup", async (req, res) => {
    try {
      const { email, firstName, lastName, password } = req.body;
      
      // Validate input
      if (!email || !firstName || !lastName || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Send verification email
      await sendVerificationEmail(email, firstName, lastName, password);
      
      res.json({ success: true, message: "Verification email sent" });
    } catch (error) {
      console.error("Email signup error:", error);
      res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  app.post("/api/auth/email/signin", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find user by email and verify password
      const user = findUserByEmailAndPassword(email, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Create session
      const sessionUser = {
        id: user.id,
        email: user.email,
        firstName: "Email",
        lastName: "User",
        profileImageUrl: null,
      };

      (req.session as any).user = sessionUser;
      res.json({ success: true, message: "Signed in successfully" });
    } catch (error) {
      console.error("Email signin error:", error);
      res.status(500).json({ message: "Sign in failed" });
    }
  });

  app.post("/api/auth/email/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // In a real app, you'd check if the user exists and resend
      // For demo purposes, just return success
      res.json({ success: true, message: "Verification email resent" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  // Email verification endpoint
  app.get("/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).send(`
          <html>
            <head><title>Invalid Verification Link</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>Invalid Verification Link</h1>
              <p>This verification link is invalid or malformed.</p>
              <a href="/login" style="color: #8B5CF6;">Return to Login</a>
            </body>
          </html>
        `);
      }

      const verification = verifyEmailToken(token);
      
      if (!verification) {
        return res.status(400).send(`
          <html>
            <head><title>Verification Link Expired</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>Verification Link Expired</h1>
              <p>This verification link has expired or has already been used.</p>
              <a href="/email-signup" style="color: #8B5CF6;">Sign Up Again</a>
            </body>
          </html>
        `);
      }

      // Create user account and session
      const newUser = {
        id: `email-user-${verification.email.replace('@', '-').replace('.', '-')}-${Date.now()}`,
        email: verification.email,
        firstName: verification.firstName,
        lastName: verification.lastName,
        profileImageUrl: null,
      };

      // Store user in session
      (req.session as any).user = newUser;

      // Show success page with auto-redirect
      res.send(`
        <html>
          <head>
            <title>Email Verified Successfully</title>
            <meta http-equiv="refresh" content="3;url=/" />
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <div style="max-width: 400px; margin: 0 auto;">
              <div style="width: 60px; height: 60px; background: #10B981; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px;">✓</span>
              </div>
              <h1 style="color: #333;">Email Verified!</h1>
              <p style="color: #666;">
                Welcome to DineTogether, ${verification.firstName}! Your account has been created successfully.
              </p>
              <p style="color: #999; font-size: 14px;">
                You'll be redirected to your dashboard in a few seconds...
              </p>
              <a href="/" style="color: #8B5CF6; text-decoration: none; font-weight: bold;">
                Continue to DineTogether →
              </a>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).send(`
        <html>
          <head><title>Verification Error</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Verification Error</h1>
            <p>Something went wrong during verification. Please try signing up again.</p>
            <a href="/email-signup" style="color: #8B5CF6;">Sign Up Again</a>
          </body>
        </html>
      `);
    }
  });
}