"use client";

import { motion } from "framer-motion";
import type { MotionProps } from "framer-motion";

export const pageTransition: MotionProps = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
};

export const fadeInUp: MotionProps = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
};

export const softHover: MotionProps = {
  whileHover: { y: -4, scale: 1.01 },
  transition: { duration: 0.2, ease: "easeOut" },
};

export const MotionDiv = motion.div;
export const MotionArticle = motion.article;
export const MotionSection = motion.section;
