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
import Overview from "./pages/dashboard/Overview";
import Onboarding from "./pages/Onboarding";
import GrowthPlan from "./pages/dashboard/GrowthPlan";
import CustomerDiscovery from "./pages/dashboard/CustomerDiscovery";
import DecisionJournal from "./pages/dashboard/DecisionJournal";
import FounderPulse from "./pages/dashboard/FounderPulse";
import CompanyPage from "./pages/CompanyPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<CompanyPage />} />
          <Route path="/approach" element={<CompanyPage />} />
          <Route path="/tools" element={<CompanyPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="chatbot" element={<Chatbot />} />
            <Route path="meeting-room" element={<MeetingRoom />} />
            <Route path="market-analysis" element={<MarketAnalysis />} />
            <Route path="product-ideas" element={<ProductIdeas />} />
            <Route path="growth-plan" element={<GrowthPlan />} />
            <Route path="customer-discovery" element={<CustomerDiscovery />} />
            <Route path="decision-journal" element={<DecisionJournal />} />
            <Route path="founder-pulse" element={<FounderPulse />} />
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
