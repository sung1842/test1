"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Candidate } from "@/types/candidate";
import candidatesData from "@/data/candidates.json";
import Header from "@/components/Header";
import FilterTabs from "@/components/FilterTabs";
import CandidateCard from "@/components/CandidateCard";
import DetailPanel from "@/components/DetailPanel";
import EmptyState from "@/components/EmptyState";
import { AnimatedMarqueeHero } from "@/components/AnimatedMarqueeHero";
import { InputWithTags } from "@/components/ui/input-with-tags";

const HERO_IMAGES = [
  "/slides/1.webp",
  "/slides/2.webp",
  "/slides/3.webp",
  "/slides/4.webp",
  "/slides/5.webp",
  "/slides/6.webp",
  "/slides/7.webp",
  "/slides/8.webp",
  "/slides/9.webp",
  "/slides/10.webp",
  "/slides/11.webp",
  "/slides/12.webp",
];

type FilterType = "all" | "developer" | "designer";

const candidates = candidatesData as Candidate[];

export default function Home() {
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [cardKey, setCardKey] = useState(0);
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
      if (saved) {
        setBookmarks(new Set(JSON.parse(saved)));
      }
    } catch {}
  }, []);

  // Combine tags + live input into one active query list
  const activeQueries = useMemo(() => {
    const all = [...searchTags];
    const live = searchInput.trim().toLowerCase();
    if (live) all.push(live);
    return all.map((q) => q.toLowerCase());
  }, [searchTags, searchInput]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (activeFilter !== "all" && c.role !== activeFilter) return false;
      if (showBookmarksOnly && !bookmarks.has(c.id)) return false;
      if (activeQueries.length === 0) return true;
      // Candidate must match ALL active tags (AND logic)
      return activeQueries.every((q) =>
        c.name.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.shortBio.toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [activeQueries, activeFilter, showBookmarksOnly, bookmarks]);

  const counts = useMemo(
    () => ({
      all: candidates.filter((c) => {
        if (showBookmarksOnly && !bookmarks.has(c.id)) return false;
        return true;
      }).length,
      developer: candidates.filter((c) => {
        if (showBookmarksOnly && !bookmarks.has(c.id)) return false;
        return c.role === "developer";
      }).length,
      designer: candidates.filter((c) => {
        if (showBookmarksOnly && !bookmarks.has(c.id)) return false;
        return c.role === "designer";
      }).length,
    }),
    [showBookmarksOnly, bookmarks]
  );

  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
    setCardKey((k) => k + 1);
    setSelectedCandidate(null);
  }, []);

  const handleSkillClick = useCallback((skill: string) => {
    setSearchTags((prev) =>
      prev.includes(skill) ? prev : [...prev, skill]
    );
    setSearchInput("");
    setCardKey((k) => k + 1);
    candidatesSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleBookmark = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        try {
          localStorage.setItem(
            "talentfolio-bookmarks",
            JSON.stringify([...next])
          );
        } catch {}
        return next;
      });
    },
    []
  );

  const handleSelect = useCallback((candidate: Candidate) => {
    setSelectedCandidate((prev) =>
      prev?.id === candidate.id ? null : candidate
    );
  }, []);

  const handleClose = useCallback(() => {
    setSelectedCandidate(null);
  }, []);

  const emptyQuery =
    searchTags.length > 0
      ? searchTags.join(", ")
      : showBookmarksOnly
      ? "북마크"
      : activeFilter;

  return (
    <div style={{ backgroundColor: "var(--background)", minHeight: "100vh" }}>
      {/* Fixed glassmorphism header */}
      <Header
        bookmarkCount={bookmarks.size}
        showBookmarksOnly={showBookmarksOnly}
        onToggleBookmarks={() => {
          setShowBookmarksOnly((v) => !v);
          setCardKey((k) => k + 1);
        }}
        onLogoClick={scrollToTop}
      />

      {/* Full-screen hero */}
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

      {/* Candidates section */}
      <div ref={candidatesSectionRef} style={{ backgroundColor: "var(--background)" }}>
        {/* Section header with search bar */}
        <div
          className="px-6 pt-12 pb-2"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <div className="max-w-7xl mx-auto">
            <InputWithTags
              placeholder="이름, 스킬, 직함으로 검색 후 Enter로 태그 추가..."
              tags={searchTags}
              onTagsChange={(tags) => {
                setSearchTags(tags);
                setCardKey((k) => k + 1);
              }}
              inputValue={searchInput}
              onInputChange={(v) => {
                setSearchInput(v);
                setCardKey((k) => k + 1);
              }}
              className="mb-4"
            />
          </div>
        </div>

        <FilterTabs
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          counts={counts}
        />

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
                  <p
                    className="text-xs mb-4"
                    style={{
                      color: "var(--text-secondary)",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {filteredCandidates.length}명의 후보자
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
        />
      </div>
    </div>
  );
}
