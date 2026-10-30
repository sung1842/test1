"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isJdAnalyzerConfigured } from "@/lib/features";
import { SiteHeader } from "@/components/site/SiteHeader";

interface HeaderProps {
  bookmarkCount: number;
  showBookmarksOnly: boolean;
  onToggleBookmarks: () => void;
  onLogoClick: () => void;
  onLoginClick: () => void;
  onEditProfile?: () => void;
}

// Discover page header: the shared SiteHeader plus this page's own actions.
// Login now goes through /login (SiteHeader), so onLogoClick/onLoginClick are kept only for API compatibility.
export default function Header({
  bookmarkCount,
  showBookmarksOnly,
  onToggleBookmarks,
  onEditProfile,
}: HeaderProps) {
  const { user, profile } = useAuth();
  const b2b = !!user && isJdAnalyzerConfigured();

  return (
    <SiteHeader
      crumb="인재 탐색"
      actions={
        <>
          {b2b && <Link href="/settings/integrations" className="login">연동</Link>}
          {b2b && <Link href="/sourcing" className="login">소싱</Link>}
          {user && profile && (
            <button type="button" className="login" onClick={onEditProfile} title="내 프로필 편집">
              {profile.name}
            </button>
          )}
          <button
            type="button"
            className="login"
            onClick={onToggleBookmarks}
            aria-pressed={showBookmarksOnly}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, color: showBookmarksOnly ? "#1F4FD6" : undefined }}
          >
            <Bookmark size={16} fill={showBookmarksOnly ? "currentColor" : "none"} />
            북마크{bookmarkCount > 0 ? ` ${bookmarkCount}` : ""}
          </button>
        </>
      }
    />
  );
}
