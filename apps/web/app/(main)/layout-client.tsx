'use client';

import { useEffect } from 'react';

import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { PageTransition } from '@/components/layout/page-transition';
import { MobileSearchOverlay } from '@/components/search/mobile-search-overlay';
import { PendingDocumentsModal } from '@/components/documents/pending-documents-modal';

/**
 * Main layout with sidebar navigation - matches Figma design
 */
export default function MainLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  // Safety net: clear stale pointer-events:none on body when no Radix modals are open
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === 'none') {
        const hasOpenModal = document.querySelector(
          '[data-state="open"][role="dialog"], [data-state="open"][role="menu"]'
        );
        if (!hasOpenModal) {
          document.body.style.pointerEvents = '';
        }
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-mp-bg-primary">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main content area */}
      <div className="min-h-screen transition-all duration-300 ml-0 md:ml-[230px]">
        {/* Header */}
        <AppHeader />

        {/* Page content */}
        <main id="main-content" className="p-4 md:p-6 pb-20 md:pb-6">
          <PageTransition variant="fade">
            {children}
          </PageTransition>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />

      {/* Mobile search overlay */}
      <MobileSearchOverlay />

      {/* Blocking modal for pending legal documents */}
      <PendingDocumentsModal />
    </div>
  );
}
