import { memo } from "react";
import Sidebar from "@/components/Sidebar";
import MobileNavigation from "@/components/MobileNavigation";

interface LayoutProps {
  children: React.ReactNode;
}

// Memoized layout component to prevent unnecessary re-renders
const Layout = memo(function Layout({ children }: LayoutProps) {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="flex-1 min-h-screen">
        {children}
      </main>
      <MobileNavigation />
    </div>
  );
});

export default Layout;