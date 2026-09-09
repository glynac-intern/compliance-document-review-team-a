# Brand & Design System: Verity

**Design Authority**: `frontend/app/login/page.tsx`  
**Brand Identity**: Verity Compliance Platform  
**Visual Archetype**: High-Trust Swiss Fintech / Institutional Enterprise SaaS (Stripe, Mercury, Linear, Ramp)

---

## 1. Design Authority & Visual Philosophy

The Login Page (`frontend/app/login/page.tsx`) serves as the **single visual source of truth** for the entire Verity application. Every subsequent screen—including the Advisor Dashboard, Document Inspector Drawer, Modals, and future Officer Review Queue and Review Workspace—must inherit its visual DNA directly:

* **High-Trust Institutional Atmosphere**: Deep, rich navy and royal blue tones convey regulatory authority, security, and calm competence.
* **Restraint over Decoration**: No frivolous 3D illustrations, no flashy gradients, no decorative filler, and no marketing dashboard tropes (such as `clarity.` or generic admin templates).
* **Typography-Led Hierarchy**: Generous whitespace, precise letter-spacing, and clear typographic scale guide user focus to actionable compliance decisions.
* **Tactile Micro-Interactions**: Predictable, subtle interactions (`active:scale-[0.98]`, `transition-all duration-150`, smooth easing curves) provide reassuring tactile feedback without distracting from high-stakes regulatory review.

---

## 2. Brand Identity & Logo Architecture

### 2.1 The Verity Logo ([`components/ui/verity-logo.tsx`](file:///c:/Users/natna/compliance-document-review-team-a/frontend/components/ui/verity-logo.tsx))
The Verity brand identity consists of two core elements:
1. **The Verity Mark (`VerityMark`)**: A crisp, geometric shield/layer emblem with precision stroke geometry symbolizing multi-tiered compliance oversight and document fidelity.
2. **The Verity Wordmark**: Set strictly in **Inter ExtraBold** (`font-inter font-extrabold tracking-[0.16em] uppercase leading-none`).

### 2.2 Brand Lockup Standards
* **Sidebar Header (Desktop)**: `VerityLogo` rendered at `size={36}` with wordmark text at `text-[21px] font-extrabold tracking-[0.16em] leading-none text-slate-900`.
* **Sidebar Collapsed Rail**: `VerityMark` rendered at `size={32}` centered at the top of the rail.
* **Login Splash Screen**: `VerityLogo` rendered with pure white mark and wordmark text (`text-white text-[15px] tracking-[0.2em] font-inter`).

---

## 3. Color System & Design Tokens

Verity implements a disciplined three-layer token architecture (Primitive $\rightarrow$ Semantic $\rightarrow$ Component):

### 3.1 Primitive Tokens
* **Brand Navy Primary**: `#1E4C77` (RGB: `30, 76, 119` / HSL: `209, 60%, 29%`)
* **Brand Sapphire / Royal Accent**: `#2575BC` (RGB: `37, 117, 188` / HSL: `208, 67%, 44%`)
* **Brand Deep Midnight Gradient**: `#163F64` to `#0C3359`
* **Surface Background Tint**: `#F8FAFC` (Slate 50)
* **Surface Card Neutral**: `#FFFFFF` (Pure White)
* **Surface Border Neutral**: `#E2E8F0` (Slate 200)
* **Text Primary**: `#0F172A` (Slate 900)
* **Text Secondary**: `#475569` (Slate 600)
* **Text Muted**: `#94A3B8` (Slate 400)

### 3.2 Semantic Theme Tokens
```css
:root {
  --background: 210 40% 98%;      /* #F8FAFC */
  --foreground: 222 47% 11%;      /* #0F172A */
  
  --primary: 209 60% 29%;         /* #1E4C77 (Brand Navy) */
  --primary-foreground: 210 40% 98%;
  
  --brand-navy: #1E4C77;
  --brand-blue: #2575BC;
  --brand-blue-hover: #1E64A3;
  --brand-blue-subtle: #EBF4FB;
  --brand-blue-border: #B9D7F2;
}
```

### 3.3 Semantic Status Palette (Strict Regulatory Standards)
In adherence to the user's explicit directive, status indicators are **text-only** (no colored dots, no warning icons, no pill borders). Status colors follow strict brand harmony:

| Status Key | Display Label | Text Color | Font Weight | Semantic Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `pending` | `Pending Review` | `#1E4C77` | `font-normal` | Directly bound to primary brand navy; conveys active queue presence without false urgency. |
| `in_review` | `In Review` | `#1E4C77` | `font-normal` | Coordinated with theme navy; indicates review is underway by an assigned officer. |
| `approved` | `Approved` | `#166534` | `font-normal` | Muted, institutional forest green; confirms document is cleared for distribution. |
| `needs_revision` | `Needs Revision` | `#92400E` | `font-normal` | Muted ochre amber; prompts advisor follow-up without alarming red styling. |
| `rejected` | `Rejected` | `#991B1B` | `font-bold` | Deep crimson wine; **the only status formatted in bold**, signifying critical prohibition while harmonizing with the navy palette. |

---

## 4. Typography System & Rules

The project mandates a strict separation between textual content and quantitative numerals:

### 4.1 Primary Interface Font: Inter
* **Variable Definition**: `var(--font-inter), 'Inter', sans-serif`
* **Scope**: **All labels, headings, body text, table cells, modal copy, and navigation items.**
* **Guiding Rule**: Maintain `font-normal` (400) or `font-medium` (500) across standard labels. Avoid arbitrary bold weights except for high-stakes warnings or explicit exceptions (e.g., `Rejected` status).

### 4.2 Numbering Font: Geometric Sans-Serif (Plus Jakarta Sans)
* **Variable Definition**: `var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif`
* **Classes**: `.font-numbers`, `.font-geometric`, `.tabular-nums`
* **Mandatory Rule**: **ONLY FOR NUMBERS**.
* **Usage**: Metric card counts (`06`, `03`, `01`), submission IDs, versions (`v1`), file sizes (`3.8 MB`), and numerical dates. Tabular lining figures guarantee fixed column widths and vertical alignment.

### 4.3 Minor / Metadata Font: Roboto
* **Variable Definition**: `var(--font-roboto), 'Roboto', sans-serif`
* **Usage**: Subtle secondary metadata strings (e.g., timestamps, document sub-IDs, helper captions).

---

## 5. Component Styling Specifications

### 5.1 Buttons
* **Primary Theme Action**: `bg-[#1e4c77] text-white hover:bg-[#163c60] active:scale-[0.98] transition-all rounded-xl font-medium text-sm shadow-xs`.
* **Secondary Action**: `bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100 rounded-xl font-medium text-xs`.
* **Utility Icon Buttons**: `h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 active:bg-[#1e4c77] active:text-white transition-all`.

### 5.2 Navigation & Sidebar
* **Width**: `260px` expanded, `68px` collapsed rail.
* **Section Headers**: CamelCase / TitleCase in non-bold, muted Inter (`font-inter text-xs text-slate-400 font-normal tracking-normal mb-1.5 px-2.5`).
* **Active Navigation Item**: `bg-[#1e4c77] text-white shadow-xs font-medium rounded-xl`.
* **Inactive Navigation Item**: `text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 font-normal rounded-xl`.

### 5.3 Bespoke Iconography Standard
* **Navigation Icon Dimensions**: Exactly `20px` (`h-5 w-5`), `strokeWidth={1.8}`.
* **Overview**: `Layers2` (2 sleek geometric planes, no 3-tier clutter).
* **My submission**: `File` (Minimal single document sheet with crisp folded corner and seamless interior, without horizontal stripes).
* **New submission (`NewSubmissionDocIcon`)**:
  - Vertical document silhouette with dog-ear corner.
  - Body filled with primary theme color (`#1e4c77`), fold in `#2575bc`.
  - Centered bold, prominent pure white `+` add button (`strokeWidth="2.6"`), visually communicating the advisor's core intake action.
* **Metrics**: `BarChart2` rendered via `stroke="currentColor"` using `text-[#1e4c77]` when inactive and `text-white` when active, guaranteeing full visibility on zero-width lines.

### 5.4 Metric Cards
* **Background Gradient**: Preserved rich brand navy gradients (`from-[#1b4a74] via-[#215e96] to-[#163f64]`).
* **Top Label**: Non-bold CamelCase Inter (`Total Submissions`, `Pending Review`, `Approved`, `Needs Revision`).
* **Center Number**: Bold Geometric Sans-Serif (`06`, `03`, `01`, `01`).
* **Bottom Subtext**: Minimal lowercase Inter (`all active documents`, `in compliance queue`, `cleared for distribution`, `action required`).
