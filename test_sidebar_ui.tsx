import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import Sidebar from '@/components/Sidebar';
import { BrowserRouter } from 'react-router-dom';
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";

// Mocking required contexts
jest.mock('@/contexts/FirebaseAuthContext', () => ({
  useFirebaseAuth: () => ({
    user: { name: 'Test User', email: 'test@example.com' },
    logout: jest.fn(),
  }),
}));

jest.mock('@/hooks/useInvitations', () => ({
  useInvitations: () => ({ count: 2 }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/api', () => ({}));

// Override useSidebar to force collapsed state for our test
jest.mock('@/contexts/SidebarContext', () => {
  const originalModule = jest.requireActual('@/contexts/SidebarContext');
  return {
    ...originalModule,
    useSidebar: () => ({
      isOpen: false,
      toggleSidebar: jest.fn(),
      isMobile: false,
      isMobileOpen: false,
      toggleMobileSidebar: jest.fn(),
      closeMobileSidebar: jest.fn(),
    }),
  };
});


const App = () => {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <div style={{ display: 'flex', height: '100vh', background: '#f0f0f0' }}>
            <SidebarProvider>
                <Sidebar />
            </SidebarProvider>
          <div style={{ flex: 1, padding: '20px' }}>
            <h1>Main Content</h1>
          </div>
        </div>
      </TooltipProvider>
    </BrowserRouter>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
