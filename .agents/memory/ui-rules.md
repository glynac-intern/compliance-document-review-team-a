# Permanent UI Rules & Engineering Invariants: Verity

**Status**: Inviolable Frontend Standards  
**Scope**: All current and future views (Advisor, Officer, Modals, Drawers, Settings)  
**Reference Benchmark**: Stripe, Mercury, Linear, Ramp, Vercel

---

## 1. Core Design Philosophy

Verity is institutional software used daily by financial advisors and compliance officers managing legal and regulatory liabilities. The interface must communicate calm precision, immediate legibility, and unquestioned reliability.

---

## 2. Forbidden Anti-Patterns (Zero Tolerance)

The following anti-patterns are strictly prohibited across all screens:

1. ❌ **No Giant KPI Dashboards**: Do not create sprawling marketing-style analytics dashboards with redundant radial gauges, sparklines, or vanity charts. This is an action-oriented compliance workflow tool.
2. ❌ **No Generic Admin Templates**: Avoid off-the-shelf Bootstrap/Material admin dashboard tropes (e.g., colored card headers, multi-color badge ribbons, excessive borders).
3. ❌ **No AI Clichés or Tropes**: Strictly forbid generic AI dashboard patterns (e.g., the discarded `clarity.` layout, pulsing radar pings, floating magic-wand icons, decorative sparkles).
4. ❌ **No Excessive Text Density**: Avoid cramming multiple competing explanations into cards. Give information breathing room with deliberate whitespace.
5. ❌ **No Decorative Illustrations or Cartoons**: Financial compliance demands professional dignity. Do not include whimsical vector illustrations, mascots, or empty-state cartoons.
6. ❌ **No Glassmorphism**: Avoid heavy frosted-glass backdrops (`backdrop-blur-xl bg-white/20`) that degrade legibility and contrast.
7. ❌ **No Random Gradients**: Gradients are permitted **only** where deliberately specified in the design authority (e.g., the Login left panel and the Advisor metric cards). All other surfaces must use clean, solid enterprise neutrals.

---

## 3. Strict Typography Rules

### 3.1 Inter for All Text & UI
* **Mandatory Class**: `font-inter`
* **Weight Rule**: **Default to `font-normal` (400)**. Use `font-medium` (500) only for active tabs and key card titles.
* **Bold Restriction**: Standard text must **never** use arbitrary bold weights. Bolding is reserved exclusively for high-stakes regulatory callouts (such as `Rejected` status or critical policy breaches).

### 3.2 Geometric Sans-Serif ONLY for Numbers
* **Mandatory Classes**: `.font-numbers`, `.font-geometric`, `.tabular-nums` (backed by Plus Jakarta Sans).
* **Strict Constraint**: **Apply exclusively to numerals**.
* **Target Elements**: Document counts (`06`, `03`, `01`), reference IDs (`DOC-8821`), file sizes (`3.8 MB`), versions (`v1`), dates (`2026-09-09`), and numerical metrics. Standard alphabet characters must never use this font.

### 3.3 Minor Metadata Font: Roboto
* **Mandatory Class**: `font-roboto`
* **Target Elements**: Subtle helper timestamps, secondary file attributes, and system audit logs.

---

## 4. Status Indicator Rules (Text-Only Regulatory Standard)

In accordance with direct regulatory review requirements, document statuses must adhere strictly to these rules:

1. **No Generic Icons**: Remove all clock icons, warning triangles, checkmark circles, and X-icons from table status columns.
2. **No Status Dots**: Remove colored circular indicator dots (`h-1.5 w-1.5 rounded-full`).
3. **No Colored Pill Borders**: Statuses must not be enclosed in colored background pills or rounded border badges.
4. **Pure Descriptive Text**: Render only the clean status label (e.g., `Pending Review`, `In Review`, `Approved`, `Needs Revision`, `Rejected`).
5. **Color & Weight Specifications**:
   * `Pending Review` & `In Review`: `text-[#1e4c77] font-normal font-inter text-[13px]`.
   * `Approved`: `text-[#166534] font-normal font-inter text-[13px]`.
   * `Needs Revision`: `text-[#92400e] font-normal font-inter text-[13px]`.
   * `Rejected`: `text-[#991b1b] font-bold font-inter text-[13px]` (**only status in bold**).

---

## 5. Sidebar & Navigation Architecture Rules

1. **Navigation Structure**:
   * Single consolidated `Workspace` navigation group (the separate `Analysis` header is removed).
   * Exact order of options:
     1. `Overview` (`Layers2`)
     2. `New submission` (`NewSubmissionDocIcon` action button)
     3. `My submission` (`File`)
     4. `Metrics` (`BarChart2`)
     5. `History` (`HistoryIcon`)
2. **Icon Sizing & Weight**:
   * Sizing is strictly **20px** (`h-5 w-5`), with stroke width set to `strokeWidth={1.8}`.
   * Standalone minimal icons only: no bulky square container boxes or outline backgrounds.
3. **Themed Navigation Icons**:
   * Inactive icons render in brand theme navy (`text-[#1e4c77]`).
   * Active icons render in pure white (`text-white`) on top of the `#1e4c77` background.
   * `History` icon: Bespoke minimal counter-clockwise circular arc with delicate time hands (`HistoryIcon`), free of bulky arrow blocks.
   * `Metrics` icon (`BarChart2`): Must use `stroke="currentColor"` to ensure vertical SVG lines render reliably across all browser engines.
4. **New Submission Action Icon**:
   * Uses the bespoke `NewSubmissionDocIcon`: a vertical document silhouette filled with `#1e4c77`, a brand blue corner fold (`#2575bc`), and a prominent, bold white `+` add button (`strokeWidth="2.6"`).

---

## 6. Table & List Layout Rules

1. **Table Typography**:
   * Headers: `text-[12px] font-normal text-slate-400 font-inter tracking-normal bg-[#f8fafc]/90 border-b border-slate-100 py-3 px-3`. Never use uppercase or bold. Column titles must be CamelCase / TitleCase (e.g., `Document Name & ID`, `Type`, `Submitted`, `Status`, `Reviewer`, `Action`).
   * Rows: `py-3.5 px-3 text-xs divide-y divide-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer`. Row titles set to `font-normal text-slate-800 text-[13px] font-inter`.
2. **Overview vs. Dedicated Submissions Separation**:
   * Overview Dashboard (`activeView === "overview"`): General high-level dashboard. The Recent Submissions card must display strictly 5 recent submissions without search bar or filter clutter, featuring a "View all" button that transitions to My Submissions.
   * My Submissions Dashboard (`activeView === "my_submissions"`): Dedicated review dashboard housing the full filter suite (search input with theme gradient focus halo, status select, sort select, document type filters) and the complete submission list.
3. **Interactive Inspection**:
   * Clicking any document row triggers the **Document Inspector Drawer** without navigating away.
4. **Search & Filter Controls**:
   * Search input uses an elegant brand theme gradient border on focus (`from-[#1e4c77] to-[#2575bc]`) with glowing theme ring offset (`shadow-[0_0_0_3px_rgba(37,117,188,0.15)]`).
   * All filter actions respond immediately in memory without page reload.

---

## 7. Officer Review Workspace Rules (Future Implementation)

When building the Compliance Officer Review Workspace (`app/officer/review/[id]/page.tsx`), the following layout rules must be honored:

1. **Split-Screen Workspace**:
   * Left Pane: Original Document Viewer (rendered PDF, DOCX, or multi-sheet XLSX).
   * Right Pane: AI Assist & Precedent Intelligence.
2. **AI Assistance Boundary**:
   * AI summary, detected compliance flags, and top 3 similar precedents are clearly grouped under an "AI Assist" header.
   * Explicit notice: *"AI Assist provides preliminary analysis only. Licensed Compliance Officers retain sole authority for all regulatory determinations."*
3. **Traceable Flag Presentation**:
   * Each flag must visually isolate: (1) Quoted Document Passage, (2) Matched Rule ID & Name, (3) Compliance Narrative, and (4) Severity Badge (`High`, `Medium`, `Low`).
4. **Graceful Degradation Banner**:
   * If AI service is offline or timed out, render: *"AI Assist is currently unavailable. The document can still be reviewed normally."* with a clean `[Retry Analysis]` action button.
5. **Decision Controls**:
   * Fixed at the bottom of the review workspace: segmented selection for `Approved`, `Rejected`, and `Needs Revision`, accompanied by a mandatory comment textarea and an authoritative `Submit Decision` button.
