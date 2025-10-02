import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import DashboardLayout from "./components/layouts/DashboardLayout";
import Chatbot from "./pages/dashboard/Chatbot";
import MeetingRoom from "./pages/dashboard/MeetingRoom";
import MarketAnalysis from "./pages/dashboard/MarketAnalysis";
import ProductIdeas from "./pages/dashboard/ProductIdeas";
import Profile from "./pages/dashboard/Profile";
import Settings from "./pages/dashboard/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard/chatbot" replace />} />
            <Route path="chatbot" element={<Chatbot />} />
            <Route path="meeting-room" element={<MeetingRoom />} />
            <Route path="market-analysis" element={<MarketAnalysis />} />
            <Route path="product-ideas" element={<ProductIdeas />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
