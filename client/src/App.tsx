import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Groups from "@/pages/groups";
import GroupDetails from "@/pages/group-details";
import Events from "@/pages/events";
import Chat from "@/pages/chat";
import InvitePage from "@/pages/invite";
import EventDetails from "@/pages/event-details";
import Profile from "@/pages/profile";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/invite/:inviteCode" component={InvitePage} />
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/groups" component={Groups} />
          <Route path="/groups/:groupId" component={GroupDetails} />
          <Route path="/events" component={Events} />
          <Route path="/events/:eventId" component={EventDetails} />
          <Route path="/chat/:eventId?" component={Chat} />
          <Route path="/profile" component={Profile} />
        </>
      )}
      <Route component={NotFound} />
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
