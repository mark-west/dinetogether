# Overview

DineTogether is a restaurant dining coordination web application built with React and Express. The app allows users to create groups, plan dining events, and chat with friends about restaurant visits. It features a modern responsive design using Tailwind CSS and ShadCN UI components, with PostgreSQL database storage and Replit-based authentication.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **UI Library**: ShadCN UI components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Responsive Design**: Mobile-first approach with dedicated mobile navigation component

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with type-safe schema definitions
- **API Pattern**: RESTful API with conventional HTTP methods
- **Error Handling**: Centralized error middleware with structured responses
- **Session Management**: Express sessions with PostgreSQL store

## Authentication System
- **Provider**: Replit OpenID Connect (OIDC) authentication
- **Strategy**: Passport.js with OpenID Connect strategy
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **User Management**: Automatic user profile creation and updates from OIDC claims

## Database Design
- **Engine**: PostgreSQL with Neon serverless database
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Core Tables**: 
  - Users (OIDC integration)
  - Groups (dining groups with admin roles)
  - Group members (many-to-many relationships)
  - Events (restaurant dining events)
  - Event RSVPs (attendance tracking)
  - Restaurant suggestions (user-generated recommendations)
  - Messages (event-based chat system)
  - Sessions (authentication state)

## Application Features
- **Group Management**: Create and join dining groups with role-based permissions
- **Event Planning**: Schedule restaurant visits with RSVP functionality
- **Chat System**: Event-specific messaging for coordination
- **Restaurant Discovery**: User suggestions and recommendations
- **Dashboard**: Overview of upcoming events and group activity
- **Mobile Responsive**: Full mobile experience with bottom navigation

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit OIDC provider for user authentication
- **Deployment**: Replit hosting environment with development tooling

## Development Tools
- **Build System**: Vite with React plugin and TypeScript support
- **Database Tools**: Drizzle Kit for schema management and migrations
- **Code Quality**: TypeScript strict mode with path mapping

## UI and Styling
- **Component Library**: Radix UI primitives with ShadCN UI wrapper
- **Icons**: Font Awesome icon library
- **Fonts**: Google Fonts integration (Architects Daughter, DM Sans, Fira Code, Geist Mono)
- **CSS Framework**: Tailwind CSS with PostCSS processing

## Runtime Libraries
- **HTTP Client**: Fetch API with custom wrapper for API requests
- **Date Handling**: date-fns for date formatting and manipulation  
- **Form Validation**: Zod schema validation with React Hook Form
- **State Management**: TanStack Query for server state caching
- **WebSocket**: WebSocket support for real-time features (imported but not fully implemented)