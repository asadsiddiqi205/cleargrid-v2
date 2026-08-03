/**
 * ClearGrid Design System — color primitives.
 *
 * These match the Figma design system tokens verbatim. Every semantic
 * token in globals.css (--color-bg-canvas, --color-text-primary, etc.)
 * resolves to one of these primitives. Use the semantic tokens in
 * components, not these primitives directly.
 */

export const neutral = {
  0: "#000000",
  25: "#09090B",
  50: "#0F1012",
  100: "#121619",
  150: "#171B1E",
  200: "#1F2227",
  300: "#26292E",
  400: "#353A40",
  500: "#484F57",
  600: "#6C737B",
  700: "#8C939D",
  800: "#B3B8BE",
  900: "#D9DCE1",
  1000: "#F5F6F8",
} as const

export const primary = {
  50: "#E5F7F7",
  100: "#C4ECEC",
  200: "#8EDADA",
  300: "#4DC3C3",
  400: "#1EACAD",
  500: "#069495", // ← brand action color
  600: "#057978",
  700: "#045E5E",
  800: "#024645",
  900: "#023030",
} as const

export const success = {
  50: "#E7F7ED",
  100: "#C3EBD1",
  200: "#8CD8A9",
  300: "#4FC27F",
  400: "#1EAF60",
  500: "#129B4D",
  600: "#0E7F3F",
  700: "#0A6431",
  800: "#074D28",
  900: "#053319",
} as const

export const warning = {
  50: "#FBF3E0",
  100: "#F5E2A8",
  200: "#EDCA6C",
  300: "#E3B53B",
  400: "#D7A62D",
  500: "#B98A20",
  600: "#946F17",
  700: "#735612",
  800: "#55400B",
  900: "#392807",
} as const

export const error = {
  50: "#FCEAEA",
  100: "#F5C3C4",
  200: "#EA9090",
  300: "#E26261",
  400: "#D74545",
  500: "#C33333",
  600: "#A22626",
  700: "#7F1D1C",
  800: "#5D1312",
  900: "#3D0D0D",
} as const

export const info = {
  50: "#E8F2FE",
  100: "#C5D9FA",
  200: "#8DB9F6",
  300: "#5E9CF1",
  400: "#3C83EB",
  500: "#2670DB",
  600: "#1D58B2",
  700: "#15448A",
  800: "#113265",
  900: "#092042",
} as const

export const chart = {
  "1-teal": "#1EACAD",
  "2-violet": "#A78BFA",
  "3-amber": "#F0B529",
  "4-rose": "#F4798B",
  "5-blue": "#5E9CF1",
  "6-green": "#4FC27F",
  "7-orange": "#F28947",
  "8-slate": "#8C939D",
} as const

export const staticColors = {
  white: "#FFFFFF",
  black: "#000000",
} as const
