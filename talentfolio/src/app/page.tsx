"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Candidate } from "@/types/candidate";
import candidatesData from "@/data/candidates.json";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import FilterSidebar from "@/components/FilterSidebar";
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
type SortType = "default" | "name" | "developer_first" | "designer_first";

const SORT_OPTIONS: { value: SortType; label: string }[] = [
  { value: "default",        label: "기본순" },
  { value: "name",           label: "이름순" },
  { value: "developer_first", label: "개발자 먼저" },
  { value: "designer_first", label: "디자이너 먼저" },
];

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
  const [searchTags, setSearchTags]               = useState<string[]>([]);
  const [searchInput, setSearchInput]             = useState("");
  const [activeFilter, setActiveFilter]           = useState<FilterType>("all");
  const [sortBy, setSortBy]                       = useState<SortType>("default");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [bookmarks, setBookmarks]                 = useState<Set<string>>(new Set());
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [cardKey, setCardKey]                     = useState(0);
  const [showAuthModal, setShowAuthModal]         = useState(false);
  const [showProfileModal, setShowProfileModal]   = useState(false);
  const [realCandidates, setRealCandidates]       = useState<Candidate[]>([]);
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem("talentfolio-bookmarks");
      if (saved) setBookmarks(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

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

  useEffect(() => {
    const channel = supabase
      .channel("profiles-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        loadRealCandidates();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadRealCandidates]);

  const allCandidates = useMemo(() => {
    return [...staticCandidates, ...realCandidates];
  }, [realCandidates]);

  const activeQueries = useMemo(() => {
    const all = [...searchTags];
    const live = searchInput.trim().toLowerCase();
    if (live) all.push(live);
    return all.map((q) => q.toLowerCase());
  }, [searchTags, searchInput]);

  const filteredCandidates = useMemo(() => {
    let result = allCandidates.filter((c) => {
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

    if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, "ko"));
    } else if (sortBy === "developer_first") {
      result = [...result].sort((a, b) =>
        a.role === b.role ? 0 : a.role === "developer" ? -1 : 1
      );
    } else if (sortBy === "designer_first") {
      result = [...result].sort((a, b) =>
        a.role === b.role ? 0 : a.role === "designer" ? -1 : 1
      );
    }

    return result;
  }, [allCandidates, activeQueries, activeFilter, showBookmarksOnly, bookmarks, sortBy]);

  const counts = useMemo(() => ({
    all:       allCandidates.filter((c) => !showBookmarksOnly || bookmarks.has(c.id)).length,
    developer: allCandidates.filter((c) => c.role === "developer" && (!showBookmarksOnly || bookmarks.has(c.id))).length,
    designer:  allCandidates.filter((c) => c.role === "designer"  && (!showBookmarksOnly || bookmarks.has(c.id))).length,
  }), [allCandidates, showBookmarksOnly, bookmarks]);

  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
    setCardKey((k) => k + 1);
    setSelectedCandidate(null);
  }, []);

  const handleSkillToggle = useCallback((skill: string) => {
    setSearchTags((prev) => {
      const next = prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill];
      return next;
    });
    setCardKey((k) => k + 1);
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
            <span style={{ color: "#f6042e" }}>한 눈에</span> 발견하세요
          </>
        }
        description="개발자·디자이너의 포트폴리오와 이력을 한 곳에서 빠르게 열람하고, 마음에 드는 인재에게 즉시 연락하세요."
        images={HERO_IMAGES}
        onCtaClick={scrollToCandidates}
      />

      {/* ── Candidates Section ── */}
      <div ref={candidatesSectionRef} style={{ backgroundColor: "var(--background)" }}>

        {/* Search bar */}
        <div className="px-4 sm:px-6 pt-10 pb-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="max-w-7xl mx-auto">
            <h2
              className="text-lg md:text-xl font-bold mb-3"
              style={{ fontFamily: "DM Sans, sans-serif", color: "var(--text-primary)" }}
            >
              인재 검색하기
            </h2>
            <InputWithTags
              placeholder="이름, 스킬, 직함으로 검색 후 Enter로 태그 추가..."
              tags={searchTags}
              onTagsChange={(tags) => { setSearchTags(tags); setCardKey((k) => k + 1); }}
              inputValue={searchInput}
              onInputChange={(v) => { setSearchInput(v); setCardKey((k) => k + 1); }}
              className="mb-0"
            />
          </div>
        </div>

        {/* Mobile filter tabs — shown only on small screens */}
        <div className="md:hidden">
          <FilterTabs activeFilter={activeFilter} onFilterChange={handleFilterChange} counts={counts} />
        </div>

        {/* Main layout: sidebar + feed */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex gap-6 items-start"
          style={{ minHeight: "80vh" }}
        >
          {/* Sidebar filter — desktop only */}
          <FilterSidebar
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            counts={counts}
            activeSkillTags={searchTags}
            onSkillToggle={handleSkillToggle}
          />

          {/* Feed */}
          <div
            className="flex-1 min-w-0 transition-all duration-300"
            style={{ marginRight: selectedCandidate ? "min(420px, 100vw)" : 0 }}
          >
            {/* Feed header: result count + sort */}
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-base font-bold"
                style={{ fontFamily: "DM Sans, sans-serif", color: "var(--text-primary)" }}
              >
                인재 목록{" "}
                <span
                  className="font-normal text-sm ml-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  ({filteredCandidates.length}명)
                </span>
              </h2>

              {/* Sort dropdown */}
              <div className="flex items-center gap-2">
                <span
                  className="text-xs hidden sm:inline"
                  style={{ color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}
                >
                  Sort by:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value as SortType); setCardKey((k) => k + 1); }}
                  className="text-sm rounded-lg px-3 py-1.5 cursor-pointer appearance-none pr-7 outline-none transition-all"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border-color)",
                    color: "#f6042e",
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 12,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23f6042e'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 8px center",
                  }}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}
                      style={{ background: "#0b0812", color: "#f0ecf8" }}
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Card grid */}
            {filteredCandidates.length === 0 ? (
              <EmptyState query={emptyQuery} />
            ) : (
              <div
                key={cardKey}
                className="grid gap-4"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
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
            )}
          </div>
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
