import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
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

  // Email signup endpoint
  app.post("/api/auth/email/signup", async (req, res) => {
    try {
      const { email, firstName, lastName, password } = req.body;
      
      // Validate input
      if (!email || !firstName || !lastName || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Create new user with email/password
      const emailUser = {
        id: "email-user-" + Date.now(),
        email: email,
        firstName: firstName,
        lastName: lastName,
        profileImageUrl: null,
      };

      // Store user in session
      (req.session as any).user = emailUser;
      
      res.json({ success: true, message: "Account created successfully" });
    } catch (error) {
      console.error("Email signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });
}