import React from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  Database,
  FileText,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
} from 'lucide-react';
import type { ResolvedSanityEnvironmentConfig } from '../../cms/studio/sanityCore';

export type EditorialStudioSection =
  | 'products'
  | 'gift-guides'
  | 'articles'
  | 'discovery'
  | 'settings';

export interface EditorialSidebarProps {
  currentSection: EditorialStudioSection;
  onSelectSection: (section: EditorialStudioSection) => void;
  onNewProduct: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  envConfig: ResolvedSanityEnvironmentConfig;
  cloudStatus: {
    checking: boolean;
    reachable: boolean | null;
    hasWriteToken: boolean;
    draftCount: number | null;
    publishedCount: number | null;
    message: string;
  };
  onRefreshCloudStatus: () => void;
  sanityDraftCount: number;
}

export const EditorialSidebar: React.FC<EditorialSidebarProps> = ({
  currentSection,
  onSelectSection,
  onNewProduct,
  isCollapsed,
  onToggleCollapse,
  envConfig,
  cloudStatus,
  onRefreshCloudStatus,
  sanityDraftCount,
}) => {
  const navItems: Array<{
    id: EditorialStudioSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    badgeLabel?: string;
  }> = [
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      count: sanityDraftCount > 0 ? sanityDraftCount : undefined,
      badgeLabel: sanityDraftCount > 0 ? `${sanityDraftCount} drafts` : undefined,
    },
    {
      id: 'gift-guides',
      label: 'Gift Guides',
      icon: BookOpen,
    },
    {
      id: 'articles',
      label: 'Stories & Articles',
      icon: FileText,
    },
    {
      id: 'discovery',
      label: 'Discovery & Taxonomy',
      icon: Compass,
    },
    {
      id: 'settings',
      label: 'Publication Settings',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`flex flex-col border-r border-[#E2E8F0] bg-[#FFFFFF] transition-all duration-200 shrink-0 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
      aria-label="Editorial Studio Navigation"
    >
      {/* Brand & Workspace Title */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#E2E8F0] bg-[#FAF9F6]">
        {!isCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-serif font-semibold text-[#0F172A] text-base leading-tight truncate">
              Science of Gifts
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#2A5A48]">
              Editorial Studio
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-md transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Primary Action Button: New Product */}
      <div className="p-3 border-b border-[#F1F5F9]">
        <button
          type="button"
          onClick={onNewProduct}
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#2A5A48] hover:bg-[#234b3c] text-white rounded-lg text-xs font-semibold shadow-sm transition-all ${
            isCollapsed ? 'px-0' : ''
          }`}
          title="Create New Product"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>New Product</span>}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#2A5A48]/10 text-[#2A5A48] font-semibold'
                  : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={item.label}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-[#2A5A48]' : 'text-[#64748B]'
                }`}
              />
              {!isCollapsed && (
                <>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.badgeLabel && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#2A5A48]/15 text-[#2A5A48]">
                      {item.badgeLabel}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Cloud & Sanity Lake Status Indicator */}
      <div className="p-3 border-t border-[#E2E8F0] bg-[#FAF9F6]">
        {isCollapsed ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onRefreshCloudStatus}
              title={`Sanity: ${cloudStatus.message}`}
              className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] rounded-md transition-colors"
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  cloudStatus.reachable ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </button>
          </div>
        ) : (
          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                <Database className="w-3 h-3 text-[#2A5A48]" />
                Sanity Content Lake
              </span>
              <button
                type="button"
                onClick={onRefreshCloudStatus}
                disabled={cloudStatus.checking}
                className="text-[#64748B] hover:text-[#0F172A] transition-colors p-0.5 rounded"
                title="Refresh Sanity connection status"
              >
                <RefreshCw
                  className={`w-3 h-3 ${cloudStatus.checking ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  cloudStatus.reachable ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="truncate font-mono text-[10px] text-[#475569]">
                {envConfig.projectId} ({envConfig.dataset})
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-0.5 border-t border-[#E2E8F0]">
              <span>Lake Drafts: {cloudStatus.draftCount ?? 0}</span>
              <span
                className={`font-semibold ${
                  cloudStatus.hasWriteToken ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {cloudStatus.hasWriteToken ? 'Write Token Active' : 'Read-Only'}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
