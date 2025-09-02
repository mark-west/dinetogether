import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Suspense, lazy } from "react";
import Layout from "@/components/Layout";

// Eagerly load critical components for first page load
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";

// Lazy load secondary components to reduce initial bundle size
const NotFound = lazy(() => import("@/pages/not-found"));
const Groups = lazy(() => import("@/pages/groups"));
const GroupDetails = lazy(() => import("@/pages/group-details"));
const Events = lazy(() => import("@/pages/events"));
const Chat = lazy(() => import("@/pages/chat"));
const InvitePage = lazy(() => import("@/pages/invite"));
const EventDetails = lazy(() => import("@/pages/event-details"));
const Profile = lazy(() => import("@/pages/profile"));
const Recommendations = lazy(() => import("@/pages/recommendations"));
const RestaurantDetails = lazy(() => import("@/pages/RestaurantDetails"));
const AdminPage = lazy(() => import("@/pages/admin"));

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Don't show any routes while loading to prevent 404 flashes
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );

  return (
    <Switch>
      <Route path="/invite/:inviteCode">
        <Suspense fallback={<LoadingSpinner />}>
          <InvitePage />
        </Suspense>
      </Route>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          {/* Redirect all other routes to login when not authenticated */}
          <Route component={Landing} />
        </>
      ) : (
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/groups">
              <Suspense fallback={<LoadingSpinner />}>
                <Groups />
              </Suspense>
            </Route>
            <Route path="/groups/:groupId">
              <Suspense fallback={<LoadingSpinner />}>
                <GroupDetails />
              </Suspense>
            </Route>
            <Route path="/events">
              <Suspense fallback={<LoadingSpinner />}>
                <Events />
              </Suspense>
            </Route>
            <Route path="/events/:eventId">
              <Suspense fallback={<LoadingSpinner />}>
                <EventDetails />
              </Suspense>
            </Route>
            <Route path="/restaurant/:id">
              <Suspense fallback={<LoadingSpinner />}>
                <RestaurantDetails />
              </Suspense>
            </Route>
            <Route path="/recommendations">
              <Suspense fallback={<LoadingSpinner />}>
                <Recommendations />
              </Suspense>
            </Route>
            <Route path="/chat">
              <Suspense fallback={<LoadingSpinner />}>
                <Chat />
              </Suspense>
            </Route>
            <Route path="/chat/:chatType/:chatId">
              <Suspense fallback={<LoadingSpinner />}>
                <Chat />
              </Suspense>
            </Route>
            <Route path="/profile">
              <Suspense fallback={<LoadingSpinner />}>
                <Profile />
              </Suspense>
            </Route>
            <Route path="/admin">
              <Suspense fallback={<LoadingSpinner />}>
                <AdminPage />
              </Suspense>
            </Route>
            <Route>
              <Suspense fallback={<LoadingSpinner />}>
                <NotFound />
              </Suspense>
            </Route>
          </Switch>
        </Layout>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
