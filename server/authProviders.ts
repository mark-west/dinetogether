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

  app.get("/api/auth/github", (req, res) => {
    const githubUser = {
      id: "github-user-" + Date.now(),
      email: "github.user@example.com", 
      firstName: "GitHub",
      lastName: "User",
      profileImageUrl: null,
    };
    
    (req.session as any).user = githubUser;
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

  app.get("/api/auth/twitter", (req, res) => {
    const twitterUser = {
      id: "twitter-user-" + Date.now(),
      email: "twitter.user@example.com",
      firstName: "Twitter",
      lastName: "User", 
      profileImageUrl: null,
    };
    
    (req.session as any).user = twitterUser;
    res.redirect("/");
  });

  app.get("/api/auth/email", (req, res) => {
    const emailUser = {
      id: "email-user-" + Date.now(),
      email: "email.user@example.com",
      firstName: "Email",
      lastName: "User",
      profileImageUrl: null,
    };
    
    (req.session as any).user = emailUser;
    res.redirect("/");
  });
}