"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Candidate } from "@/types/candidate";
import candidatesData from "@/data/candidates.json";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import FilterTabs from "@/components/FilterTabs";
import CandidateCard from "@/components/CandidateCard";
import DetailPanel from "@/components/DetailPanel";
import EmptyState from "@/components/EmptyState";
import { AnimatedMarqueeHero } from "@/components/AnimatedMarqueeHero";
import { InputWithTags } from "@/components/ui/input-with-tags";
import FloatingChat from "@/components/chat/FloatingChat";
import AuthModal from "@/components/AuthModal";
import ProfileEditModal from "@/components/ProfileEditModal";

const HERO_IMAGES = [
  "/slides/1.webp", "/slides/2.webp", "/slides/3.webp",
  "/slides/4.webp", "/slides/5.webp", "/slides/6.webp",
  "/slides/7.webp", "/slides/8.webp", "/slides/9.webp",
  "/slides/10.webp", "/slides/11.webp", "/slides/12.webp",
];

type FilterType = "all" | "developer" | "designer";

// 정적 더미 후보자에 source 태그 부착
const staticCandidates: Candidate[] = (candidatesData as Candidate[]).map((c) => ({
  ...c,
  source: "static" as const,
}));

function profileToCandidate(p: {
  id: string; name: string; role: string; title: string | null;
  avatar_url: string | null; short_bio?: string | null; long_bio?: string | null;
  skills?: string[] | null; github_url?: string | null; portfolio_url?: string | null;
  behance_url?: string | null; linkedin_url?: string | null;
}): Candidate {
  return {
    id: p.id,
    name: p.name,
    role: (p.role as "developer" | "designer") || "developer",
    title: p.title || "",
    avatar: p.avatar_url || "",
    shortBio: p.short_bio || "",
    longBio: p.long_bio || "",
    skills: p.skills || [],
    links: {
      github: p.github_url || "",
      portfolio: p.portfolio_url || "",
      behance: p.behance_url || "",
      linkedin: p.linkedin_url || "",
    },
    email: "",
    source: "profile",
    supabaseId: p.id,
  };
}

export default function Home() {
  const { user } = useAuth();
  const [searchTags, setSearchTags]           = useState<string[]>([]);
  const [searchInput, setSearchInput]         = useState("");
  const [activeFilter, setActiveFilter]       = useState<FilterType>("all");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [bookmarks, setBookmarks]             = useState<Set<string>>(new Set());
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [cardKey, setCardKey]                 = useState(0);
  const [showAuthModal, setShowAuthModal]     = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [realCandidates, setRealCandidates]   = useState<Candidate[]>([]);
  const [chatTarget, setChatTarget] = useState<{
    name: string; email: string;
    isDummy?: boolean; candidateInfo?: Candidate; supabaseId?: string;
  } | null>(null);
  const candidatesSectionRef = useRef<HTMLDivElement>(null);

  const scrollToCandidates = useCallback(() => {
    candidatesSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // 북마크 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem("talentfolio-bookmarks");
      if (saved) setBookmarks(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  // 실제 공개 프로필 로드
  const loadRealCandidates = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("is_public", true);
    if (data && data.length > 0) {
      setRealCandidates(data.map(profileToCandidate));
    }
  }, []);

  useEffect(() => { loadRealCandidates(); }, [loadRealCandidates]);

  // 정적 + 실제 후보자 합산 (실제 유저 중 정적 목록과 이름 중복 없음)
  const allCandidates = useMemo(() => {
    const realIds = new Set(realCandidates.map((c) => c.supabaseId));
    // 자기 자신이 실제 유저로 등록된 경우 중복 방지
    return [...staticCandidates, ...realCandidates];
  }, [realCandidates]);

  const activeQueries = useMemo(() => {
    const all = [...searchTags];
    const live = searchInput.trim().toLowerCase();
    if (live) all.push(live);
    return all.map((q) => q.toLowerCase());
  }, [searchTags, searchInput]);

  const filteredCandidates = useMemo(() => {
    return allCandidates.filter((c) => {
      if (activeFilter !== "all" && c.role !== activeFilter) return false;
      if (showBookmarksOnly && !bookmarks.has(c.id)) return false;
      if (activeQueries.length === 0) return true;
      return activeQueries.every((q) =>
        c.name.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.shortBio.toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [allCandidates, activeQueries, activeFilter, showBookmarksOnly, bookmarks]);

  const counts = useMemo(() => ({
    all: allCandidates.filter((c) => !showBookmarksOnly || bookmarks.has(c.id)).length,
    developer: allCandidates.filter((c) => c.role === "developer" && (!showBookmarksOnly || bookmarks.has(c.id))).length,
    designer:  allCandidates.filter((c) => c.role === "designer"  && (!showBookmarksOnly || bookmarks.has(c.id))).length,
  }), [allCandidates, showBookmarksOnly, bookmarks]);

  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
    setCardKey((k) => k + 1);
    setSelectedCandidate(null);
  }, []);

  const handleSkillClick = useCallback((skill: string) => {
    setSearchTags((prev) => prev.includes(skill) ? prev : [...prev, skill]);
    setSearchInput("");
    setCardKey((k) => k + 1);
    candidatesSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleBookmark = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem("talentfolio-bookmarks", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const handleSelect = useCallback((candidate: Candidate) => {
    setSelectedCandidate((prev) => prev?.id === candidate.id ? null : candidate);
  }, []);

  const handleClose = useCallback(() => { setSelectedCandidate(null); }, []);

  const handleStartChat = useCallback((candidate: Candidate) => {
    if (!user) { setShowAuthModal(true); return; }
    const isDummy = !candidate.source || candidate.source === "static";
    setChatTarget({
      name: candidate.name,
      email: candidate.email,
      isDummy,
      candidateInfo: isDummy ? candidate : undefined,
      supabaseId: candidate.supabaseId,
    });
  }, [user]);

  const emptyQuery =
    searchTags.length > 0 ? searchTags.join(", ") :
    showBookmarksOnly ? "북마크" : activeFilter;

  return (
    <div style={{ backgroundColor: "var(--background)", minHeight: "100vh" }}>
      <Header
        bookmarkCount={bookmarks.size}
        showBookmarksOnly={showBookmarksOnly}
        onToggleBookmarks={() => { setShowBookmarksOnly((v) => !v); setCardKey((k) => k + 1); }}
        onLogoClick={scrollToTop}
        onLoginClick={() => setShowAuthModal(true)}
        onEditProfile={() => setShowProfileModal(true)}
      />

      <AnimatedMarqueeHero
        tagline="인재 발견 플랫폼"
        title={
          <>
            최고의 인재를
            <br />
            <span style={{ color: "var(--accent)" }}>한 눈에</span> 발견하세요
          </>
        }
        description="개발자·디자이너의 포트폴리오와 이력을 한 곳에서 빠르게 열람하고, 마음에 드는 인재에게 즉시 연락하세요."
        ctaText="인재 둘러보기 →"
        images={HERO_IMAGES}
        onCtaClick={scrollToCandidates}
      />

      <div ref={candidatesSectionRef} style={{ backgroundColor: "var(--background)" }}>
        <div className="px-6 pt-12 pb-2" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="max-w-7xl mx-auto">
            <InputWithTags
              placeholder="이름, 스킬, 직함으로 검색 후 Enter로 태그 추가..."
              tags={searchTags}
              onTagsChange={(tags) => { setSearchTags(tags); setCardKey((k) => k + 1); }}
              inputValue={searchInput}
              onInputChange={(v) => { setSearchInput(v); setCardKey((k) => k + 1); }}
              className="mb-4"
            />
          </div>
        </div>

        <FilterTabs activeFilter={activeFilter} onFilterChange={handleFilterChange} counts={counts} />

        <div className="flex" style={{ minHeight: "80vh" }}>
          <main
            className="flex-1 p-6 transition-all duration-300"
            style={{ marginRight: selectedCandidate ? "min(420px, 100vw)" : 0 }}
          >
            <div className="max-w-7xl mx-auto">
              {filteredCandidates.length === 0 ? (
                <EmptyState query={emptyQuery} />
              ) : (
                <>
                  <p className="text-xs mb-4" style={{ color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace" }}>
                    {filteredCandidates.length}명의 후보자
                    {realCandidates.length > 0 && (
                      <span style={{ marginLeft: 8, color: "var(--accent)", opacity: 0.7 }}>
                        · 실제 유저 {realCandidates.length}명 포함
                      </span>
                    )}
                  </p>
                  <div
                    key={cardKey}
                    className="grid gap-4"
                    style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
                  >
                    {filteredCandidates.map((candidate, index) => (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        isSelected={selectedCandidate?.id === candidate.id}
                        isBookmarked={bookmarks.has(candidate.id)}
                        onSelect={handleSelect}
                        onBookmark={handleBookmark}
                        onSkillClick={handleSkillClick}
                        onMessage={handleStartChat}
                        animationDelay={index * 50}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </main>
        </div>

        <DetailPanel
          candidate={selectedCandidate}
          isBookmarked={selectedCandidate ? bookmarks.has(selectedCandidate.id) : false}
          onClose={handleClose}
          onBookmark={(id) => handleBookmark(id)}
          onSkillClick={handleSkillClick}
          onMessage={handleStartChat}
        />
      </div>

      <FloatingChat
        pendingTarget={chatTarget}
        onTargetHandled={() => setChatTarget(null)}
      />

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      <AnimatePresence>
        {showProfileModal && (
          <ProfileEditModal
            onClose={() => setShowProfileModal(false)}
            onSaved={loadRealCandidates}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
