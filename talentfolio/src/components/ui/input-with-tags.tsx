"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TagProps {
  text: string;
  onRemove: () => void;
}

const Tag = ({ text, onRemove }: TagProps) => {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -10 }}
      transition={{
        duration: 0.4,
        ease: "circInOut",
        type: "spring",
      }}
      className="px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1"
      style={{ background: "var(--mist)", color: "var(--accent)" }}
    >
      {text}
      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <Button
          onClick={onRemove}
          className="bg-transparent text-xs h-fit flex items-center rounded-full justify-center p-1 hover:bg-white"
          style={{ color: "var(--accent)" }}
        >
          <X className="w-3 h-3" />
        </Button>
      </motion.div>
    </motion.span>
  );
};

interface InputWithTagsProps {
  placeholder?: string;
  className?: string;
  limit?: number;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
}

const InputWithTags = ({
  placeholder,
  className,
  limit = 10,
  tags,
  onTagsChange,
  inputValue,
  onInputChange,
}: InputWithTagsProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (!limit || tags.length < limit) {
        onTagsChange([...tags, inputValue.trim()]);
        onInputChange("");
      }
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onTagsChange(tags.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove: number) => {
    onTagsChange(tags.filter((_, i) => i !== indexToRemove));
  };

  return (
    <div className={cn("flex flex-col gap-3 w-full", className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
      >
        <motion.input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "이름, 스킬, 직함으로 검색 후 Enter..."}
                    className="w-full px-5 py-3.5 outline-none text-[15px] focus-visible:border-[var(--accent)]"
          style={{
            backgroundColor: "var(--surface)",
            border: "1.5px solid #8FA6CC",
            borderRadius: "var(--r-input)",
            color: "var(--text-primary)",
            fontFamily: "Pretendard Variable, sans-serif",
          }}
          disabled={limit ? tags.length >= limit : false}
        />
      </motion.div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {tags.map((tag, index) => (
              <Tag key={`${tag}-${index}`} text={tag} onRemove={() => removeTag(index)} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export { InputWithTags };
