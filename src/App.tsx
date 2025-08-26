// src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Layout } from "@/components/Layout";
import { ClerkAccountsProvider } from "@/contexts/ClerkAccountsContext";
import BulkSignup from "./pages/BulkSignup";
import BulkImport from "./pages/BulkImport";
import ResetPasswords from "./pages/ResetPasswords";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";
import EmailTemplates from "./pages/EmailTemplates";
import SingleUserImport from "./pages/SingleUserImport"; // <-- IMPORT THE NEW PAGE

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ClerkAccountsProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<BulkSignup />} />
                <Route path="/bulk-signup" element={<BulkSignup />} />
                <Route path="/bulk-import" element={<BulkImport />} />
                <Route path="/single-user-import" element={<SingleUserImport />} /> {/* <-- ADD THE NEW ROUTE */}
                <Route path="/reset-passwords" element={<ResetPasswords />} />
                <Route path="/email-templates" element={<EmailTemplates />} />
                <Route path="/user-management" element={<UserManagement />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </ClerkAccountsProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;