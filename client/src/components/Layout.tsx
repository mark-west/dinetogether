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
      <div className="flex-1 flex flex-col min-h-screen md:min-h-0">
        {children}
      </div>
      <MobileNavigation />
    </div>
  );
});

export default Layout;