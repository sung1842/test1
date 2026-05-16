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
      initial={{ opacity: 0, scale: 0.8, y: -10, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.8, y: -10, filter: "blur(10px)" }}
      transition={{
        duration: 0.4,
        ease: "circInOut",
        type: "spring",
      }}
      className="bg-[#11111198] px-2 py-1 rounded-xl text-sm flex items-center gap-1 shadow-[0_0_10px_rgba(0,0,0,0.2)] backdrop-blur-sm"
      style={{ color: "var(--accent)", border: "1px solid rgba(91,110,245,0.3)" }}
    >
      {text}
      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <Button
          onClick={onRemove}
          className="bg-transparent text-xs h-fit flex items-center rounded-full justify-center p-1 hover:bg-[#11111136]"
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
        initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
      >
        <motion.input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "이름, 스킬, 직함으로 검색 후 Enter..."}
          whileHover={{ scale: 1.005 }}
          className="w-full px-5 py-3.5 rounded-2xl backdrop-blur-sm outline-none ring-0 text-sm"
          style={{
            backgroundColor: "rgba(17,17,17,0.6)",
            border: "1px solid var(--border-color)",
            color: "var(--text-primary)",
            fontFamily: "DM Sans, sans-serif",
            boxShadow: "0 0 20px rgba(0,0,0,0.2)",
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
