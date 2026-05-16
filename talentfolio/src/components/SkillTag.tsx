"use client";

import {
  SiReact, SiTypescript, SiNodedotjs, SiPostgresql, SiDocker,
  SiKubernetes, SiPython, SiGo, SiSwift,
  SiFigma, SiBlender, SiThreedotjs, SiFramer, SiTailwindcss,
  SiTerraform, SiRedis, SiApachekafka, SiFastapi, SiPytorch,
  SiPrometheus, SiVercel, SiNextdotjs, SiNotion,
  SiGithub, SiRust,
} from "react-icons/si";
import { IconType } from "react-icons";
import { Code2, Palette, Layers, Zap, Box, Globe } from "lucide-react";

interface SkillConfig {
  icon: IconType | React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  bg: string;
}

const SKILL_MAP: Record<string, SkillConfig> = {
  "React":        { icon: SiReact,           color: "#61DAFB", bg: "rgba(97,218,251,0.12)"  },
  "TypeScript":   { icon: SiTypescript,      color: "#3178C6", bg: "rgba(49,120,198,0.12)"  },
  "Next.js":      { icon: SiNextdotjs,       color: "#ffffff", bg: "rgba(255,255,255,0.08)" },
  "Node.js":      { icon: SiNodedotjs,       color: "#6DBF4B", bg: "rgba(109,191,75,0.12)"  },
  "PostgreSQL":   { icon: SiPostgresql,      color: "#699aca", bg: "rgba(105,154,202,0.12)" },
  "Docker":       { icon: SiDocker,          color: "#2496ED", bg: "rgba(36,150,237,0.12)"  },
  "AWS":          { icon: Globe,             color: "#FF9900", bg: "rgba(255,153,0,0.12)"  },
  "Kubernetes":   { icon: SiKubernetes,      color: "#326CE5", bg: "rgba(50,108,229,0.12)"  },
  "Python":       { icon: SiPython,          color: "#FFD43B", bg: "rgba(255,212,59,0.12)"  },
  "Go":           { icon: SiGo,              color: "#00ADD8", bg: "rgba(0,173,216,0.12)"   },
  "Swift":        { icon: SiSwift,           color: "#F05138", bg: "rgba(240,81,56,0.12)"   },
  "SwiftUI":      { icon: SiSwift,           color: "#F05138", bg: "rgba(240,81,56,0.12)"   },
  "Figma":        { icon: SiFigma,           color: "#F24E1E", bg: "rgba(242,78,30,0.12)"   },
  "Blender":      { icon: SiBlender,         color: "#F5792A", bg: "rgba(245,121,42,0.12)"  },
  "Three.js":     { icon: SiThreedotjs,      color: "#ffffff", bg: "rgba(255,255,255,0.08)" },
  "Framer":       { icon: SiFramer,          color: "#0055FF", bg: "rgba(0,85,255,0.12)"    },
  "Tailwind":     { icon: SiTailwindcss,     color: "#06B6D4", bg: "rgba(6,182,212,0.12)"   },
  "Terraform":    { icon: SiTerraform,       color: "#7B42BC", bg: "rgba(123,66,188,0.12)"  },
  "Redis":        { icon: SiRedis,           color: "#DC382D", bg: "rgba(220,56,45,0.12)"   },
  "Kafka":        { icon: SiApachekafka,     color: "#ffffff", bg: "rgba(255,255,255,0.08)" },
  "FastAPI":      { icon: SiFastapi,         color: "#009688", bg: "rgba(0,150,136,0.12)"   },
  "PyTorch":      { icon: SiPytorch,         color: "#EE4C2C", bg: "rgba(238,76,44,0.12)"   },
  "Prometheus":   { icon: SiPrometheus,      color: "#E6522C", bg: "rgba(230,82,44,0.12)"   },
  "Vercel":       { icon: SiVercel,          color: "#ffffff", bg: "rgba(255,255,255,0.08)" },
  "GitHub":       { icon: SiGithub,          color: "#ffffff", bg: "rgba(255,255,255,0.08)" },
  "Rust":         { icon: SiRust,            color: "#CE422B", bg: "rgba(206,66,43,0.12)"   },
  "GSAP":         { icon: Zap,               color: "#88CE02", bg: "rgba(136,206,2,0.12)"   },
  "WebGL":        { icon: Globe,              color: "#990000", bg: "rgba(153,0,0,0.12)"     },
  "Spline":       { icon: Box,               color: "#4353FF", bg: "rgba(67,83,255,0.12)"   },
  "Notion":       { icon: SiNotion,          color: "#ffffff", bg: "rgba(255,255,255,0.08)" },
  "LangChain":    { icon: Layers,            color: "#1DB954", bg: "rgba(29,185,84,0.12)"   },
  "CUDA":         { icon: Box,               color: "#76B900", bg: "rgba(118,185,0,0.12)"   },
  "ArgoCD":       { icon: Layers,            color: "#EF7B4D", bg: "rgba(239,123,77,0.12)"  },
  "gRPC":         { icon: Globe,             color: "#244C5A", bg: "rgba(36,76,90,0.12)"    },
  "Combine":      { icon: Code2,             color: "#F05138", bg: "rgba(240,81,56,0.12)"   },
  "Core Data":    { icon: Code2,             color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  "CloudKit":     { icon: Globe,             color: "#1C9BF0", bg: "rgba(28,155,240,0.12)"  },
  "Xcode":        { icon: Code2,             color: "#147EFB", bg: "rgba(20,126,251,0.12)"  },
  "Illustrator":  { icon: Palette,           color: "#FF9A00", bg: "rgba(255,154,0,0.12)"   },
  "Photoshop":    { icon: Palette,           color: "#31A8FF", bg: "rgba(49,168,255,0.12)"  },
  "After Effects":{ icon: Palette,           color: "#9999FF", bg: "rgba(153,153,255,0.12)" },
  "Cinema 4D":    { icon: Box,               color: "#011A6A", bg: "rgba(1,26,106,0.12)"    },
  "Motion":       { icon: Zap,               color: "#e879f9", bg: "rgba(232,121,249,0.12)" },
  "Branding":     { icon: Palette,           color: "#fb923c", bg: "rgba(251,146,60,0.12)"  },
  "Design System":{ icon: Layers,            color: "#e879f9", bg: "rgba(232,121,249,0.12)" },
  "Prototyping":  { icon: Zap,               color: "#fb923c", bg: "rgba(251,146,60,0.12)"  },
  "UX Research":  { icon: Globe,             color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  "Pinecone":     { icon: Layers,            color: "#1db980", bg: "rgba(29,185,128,0.12)"  },
  "Maze":         { icon: Code2,             color: "#FF4F64", bg: "rgba(255,79,100,0.12)"  },
  "Lottie":       { icon: Zap,               color: "#00DDB3", bg: "rgba(0,221,179,0.12)"   },
  "Adobe XD":     { icon: Palette,           color: "#FF61F6", bg: "rgba(255,97,246,0.12)"  },
};

const DEFAULT: SkillConfig = {
  icon: Code2,
  color: "#a78bfa",
  bg: "rgba(167,139,250,0.1)",
};

interface SkillTagProps {
  skill: string;
  onClick?: (skill: string) => void;
  small?: boolean;
}

export default function SkillTag({ skill, onClick, small }: SkillTagProps) {
  const config = SKILL_MAP[skill] ?? DEFAULT;
  const Icon = config.icon as React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;

  return (
    <button
      onClick={() => onClick?.(skill)}
      className="inline-flex items-center gap-1.5 rounded-full transition-all duration-200"
      style={{
        backgroundColor: config.bg,
        border: `1px solid ${config.color}30`,
        color: config.color,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: small ? "10px" : "11px",
        padding: small ? "3px 8px" : "4px 10px",
        cursor: onClick ? "pointer" : "default",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!onClick) return;
        (e.currentTarget as HTMLElement).style.backgroundColor = config.color + "25";
        (e.currentTarget as HTMLElement).style.borderColor = config.color + "80";
      }}
      onMouseLeave={(e) => {
        if (!onClick) return;
        (e.currentTarget as HTMLElement).style.backgroundColor = config.bg;
        (e.currentTarget as HTMLElement).style.borderColor = config.color + "30";
      }}
    >
      <Icon size={small ? 10 : 12} style={{ color: config.color, flexShrink: 0 }} />
      {skill}
    </button>
  );
}
