import { useState } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import HomePage from "@/pages/home";
import CombinedSummaryPage from "@/pages/combined-summary";
import { TrendingUp } from "lucide-react";

function Router() {
  const [summaries, setSummaries] = useState<Record<string, any[]>>({});
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <TrendingUp className="text-primary text-2xl mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Excel Summary Generator</h1>
            </div>
            <nav className="flex space-x-4">
              <Link href="/">
                <Button 
                  variant={location === '/' ? 'default' : 'ghost'}
                  size="sm"
                >
                  Data Panels
                </Button>
              </Link>
              <Link href="/combined">
                <Button 
                  variant={location === '/combined' ? 'default' : 'ghost'}
                  size="sm"
                >
                  Combined Summary
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Switch>
          <Route path="/">
            <HomePage summaries={summaries} setSummaries={setSummaries} />
          </Route>
          <Route path="/combined">
            <CombinedSummaryPage />
          </Route>
        </Switch>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <TrendingUp className="text-primary text-xl mr-2" />
              <span className="text-gray-700 font-medium">Excel Summary Generator</span>
            </div>
            <div className="text-sm text-gray-500">
              © 2024 Financial Data Processing Tool. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
