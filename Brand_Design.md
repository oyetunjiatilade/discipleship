---
name: SLC Household Design System
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#514536'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#847564'
  outline-variant: '#d6c3b0'
  surface-tint: '#845400'
  primary: '#845400'
  on-primary: '#ffffff'
  primary-container: '#fbb24a'
  on-primary-container: '#6e4600'
  inverse-primary: '#ffb958'
  secondary: '#9c4400'
  on-secondary: '#ffffff'
  secondary-container: '#fc853c'
  on-secondary-container: '#652a00'
  tertiary: '#af300e'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffac98'
  on-tertiary-container: '#982000'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffddb6'
  primary-fixed-dim: '#ffb958'
  on-primary-fixed: '#2a1800'
  on-primary-fixed-variant: '#643f00'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb68f'
  on-secondary-fixed: '#331200'
  on-secondary-fixed-variant: '#773200'
  tertiary-fixed: '#ffdad2'
  tertiary-fixed-dim: '#ffb4a2'
  on-tertiary-fixed: '#3c0700'
  on-tertiary-fixed-variant: '#8a1c00'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
  brand-black: '#000000'
  surface-canvas: '#F5F5F5'
  surface-card: '#FFFFFF'
  border-card: '#E5E5E5'
  text-primary: '#171717'
  text-secondary: '#737373'
  text-muted: '#A3A3A3'
  status-success: '#15803D'
  status-warning: '#D97706'
  status-critical: '#DC2626'
  status-info: '#2563EB'
  status-success-subtle: '#F0FDF4'
  status-warning-subtle: '#FFFBEB'
  status-critical-subtle: '#FEF2F2'
  status-info-subtle: '#EFF6FF'
  brand-amber-subtle: '#FFFBEB'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

The design system establishes a high-performance, mission-critical operational cockpit for community and household management across Supernatural Life Church. Designed specifically for pastoral leaders, departmental heads, and administrative staff who manage member integration and spiritual community health, the interface balances rigorous SaaS precision with ecclesiastical warmth and human dignity.

### Aesthetic Philosophy
The visual direction fuses **Corporate Modern SaaS** utility with a focused, warm civic tone. It rejects frivolous visual ornament, complex skeumorphism, or noisy decorative elements in favor of crisp typography, clean hairline separation, purposeful negative space, and disciplined data density. Because church leaders and volunteers often operate in low-connectivity church venues, bustling auditoriums, or on varied handheld mobile devices, clarity is paramount:
- **Calm, High-Legibility Control**: Interfaces prioritize high scannability, rapid identification of attendance status, and immediate comprehension of wellbeing indicators (`Doing well`, `Needs attention`, `At risk`).
- **Warm Authority**: Anchored by the vibrant flame palette derived from the church’s identity—radiant gold, ember orange, and assertive flame red—balanced decisively against deep neutral slates and crisp alabaster backgrounds.
- **Utilitarian & Offline-First Respect**: Information displays state confidence clearly, celebrating offline sync cues, immediate single-tap responsive behaviors, and distinct tactile interactive boundaries.

## Colors

The color palette directly extends the energy of the church's radiant flame mark while upholding WCAG 2.1 AA accessibility ratios. The system uses high-contrast neutral foundations for structure and reserves high-saturation chromatic colors for intentional focus, branding, and status indications.

### Color Rules & Application
- **Brand Accents**: The primary amber (`#FBB24A`) acts as the premier identity marker and active highlight. The secondary flame orange (`#F47F36`) and flame red (`#F15E3A`) represent energy, progression, and heightened urgency across the church's multi-layered structure (Trybes, Service Departments, Connect Groups).
- **Text & Structure**: Pure `#000000` is preserved for master headings, high-contrast navigation states, and identity glyphs. Body copy relies on `#171717` to reduce eye fatigue across data tables. Secondary metadata, timestamps, and role labels use `#737373`, while non-interactive placeholder copy and disabled states use `#A3A3A3`.
- **Surfaces**: Canvas views employ light neutral background `#F5F5F5`, providing structural contrast against `#FFFFFF` elevated container surfaces bounded by `#E5E5E5` hairline dividers.
- **Semantic Rigor**: The status colors are strictly paired with iconography and text labels:
  - `status-success` (`#15803D`): Active members, `Present` attendance state, completed milestones, healthy sync status.
  - `status-warning` (`#D97706`): `Needs attention` status, pending sync queue, `Excused` attendance, open unassigned tasks.
  - `status-critical` (`#DC2626`): `At risk` workers, `Absent` alert triggers, consecutive drop-offs, disconnected members.
  - `status-info` (`#2563EB`): System notifications, new first-timer capture intake, informational banners.

## Typography

Typographic hierarchy is powered exclusively by **Inter**, selected for its exceptional technical clarity, comprehensive glyph coverage, tall x-height, and open aperture design that preserves legibility on small-format handheld viewports.

### Architectural Principles
- **Neutral Voice**: The typography delivers objective administrative authority without distracting stylistic quirks. Numbers, dates, and member counts are presented cleanly.
- **Tabular Figures**: For tables, member tallies, attendance ratios, and sync counters, tabular numbers (`font-variant-numeric: tabular-nums`) are enforced across all numeric tokens to ensure stable vertical alignment.
- **Hierarchy and Proportion**: Display roles (`display-lg`, `headline-lg`) are reserved for module dashboards, major administrative metrics, and view titles. Body copy is optimized at `14px` (`body-md`) for desktop density and `16px` (`body-lg`) for mobile forms to prevent auto-zoom in mobile web browsers.
- **Labels and Badges**: Status tokens, workflow stage badges, and role chips leverage `label-sm` and `label-md` with semi-bold weights to guarantee instant visual hierarchy when nestled into table rows or card lists.

## Layout & Spacing

The layout is built upon an 8-point base grid system (with a 4-point micro-scale for compact form items), engineered around a mobile-first philosophy that scales seamlessly to multi-column desktop dashboards.

### Responsive Breakpoints
- **Mobile (< 768px)**: Fluid single-column layout. Margin is `1rem` (16px), and gutter is `1rem` (16px). Touch target areas must never drop below 44px by 44px (`min-height: 44px`). Critical operational actions (e.g., "Mark All Present", sync actions) are pinned in an accessible thumb-zone at the screen bottom.
- **Tablet (768px – 1024px)**: 8-column layout with 24px margins. Cards reflow into balanced 2-column grids for Trybe rosters and session logs.
- **Desktop (> 1024px)**: 12-column fixed-max layout capped at 1280px container width with 32px (`2rem`) margins. Navigation shifts to an anchored left-hand rail, allowing administrators rapid data ingestion across large member datasets.

### Spacing Usage
- `space-xs` (4px): Micro gaps between icons and labels, inner badge padding.
- `space-sm` (8px): Gaps between form fields and their respective labels, compact button horizontal insets.
- `space-md` (16px): Standard inner padding for cards, table row vertical padding, standard component stacking.
- `space-lg` (24px): Card interior padding on desktop, section separation within modals and side-sheets.
- `space-xl` (32px): Major card grouping margins, dashboard header lower margins.
- `space-2xl` (48px): Global page section dividers.

## Elevation & Depth

This design system deliberately employs a restrained, planar depth model. Visual hierarchy is achieved predominantly through crisp `#E5E5E5` hairline borders and subtle tonal shifts on `#F5F5F5` canvas backgrounds, rather than heavy drop shadows. This maintains extreme visual clarity in bright auditorium environments or under sunlight on mobile screens.

### Elevation Hierarchy
1. **Level 0 (Flat Canvas)**: `#F5F5F5`. The foundational canvas layer where all background interaction occurs.
2. **Level 1 (Card & Module Surface)**: Pure `#FFFFFF` surface accompanied by a crisp `1px solid #E5E5E5` outline and a delicate ambient shadow:
   `box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);`
   Used for member summary cards, Trybe listings, wellbeing widgets, and form containers.
3. **Level 2 (Hover & Elevated Items)**: Interactive cards during hover, filter dropdown menus, and popovers:
   `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);`
   Coupled with a border transition to `#D4D4D4`.
4. **Level 3 (Modals, Overlays & Sticky Triggers)**: Side drawers (for deep member profiles), sync floating indicators, and confirmation dialogs:
   `box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05);`
   Rendered with a neutral backdrop scrim of `rgba(0, 0, 0, 0.4)`.

## Shapes

The shape system balances crisp enterprise architecture with approachable community warmth, utilizing purposeful, restrained radii across all elements:

### Radii Hierarchy
- **Cards and Data Containers**: `8px` (`rounded-card` / `0.5rem`). Delivers clean boundaries for tabular lists, member rosters, and metrics widgets without visually separating dense data.
- **Form Controls & Inputs**: `6px` (`rounded-input` / `0.375rem`). Ensures crisp framing for text inputs, select dropdowns, search boxes, and textarea fields.
- **Buttons and Action Targets**: `6px` (`rounded-button` / `0.375rem`). Matches the precision of form controls for visual balance in compound toolbars.
- **Status Tags, Chips & Badges**: Fully pill-shaped (`9999px`) or `4px` (`rounded-sm`). Status indicators (`Doing well`, `At risk`) use compact rounded treatments (`4px`) to preserve horizontal reading flow, while interactive filter chips leverage pill-shaped geometry (`9999px`) for quick tactile identification.
- **Avatars**: Circular (`50%` / `rounded-full`) for member profile pictures and first-letter initials.

## Components

### 1. Buttons
- **Primary Button**: Solid fill with `background-color: #F47F36` (or high-contrast `#171717` for executive actions), text `#FFFFFF`, font weight 600, border radius `6px`. Height `40px` on desktop, `44px` on mobile. On hover, background shifts 8% darker. Focus ring is an amber halo: `0 0 0 2px #FFFFFF, 0 0 0 4px #FBB24A`.
- **Secondary Button**: Background `#FFFFFF`, border `1px solid #E5E5E5`, text `#171717`, border radius `6px`. On hover, background transitions to `#F5F5F5`.
- **Danger / Destructive Action**: Background `#FEF2F2`, border `1px solid #FCA5A5`, text `#DC2626`. Focus ring tints `#DC2626`.
- **Touch-Optimized Toggles (Attendance Buttons)**: Large `min-height: 48px` segmental controls for mobile attendance:
  - `Present`: Selected state gets solid green border (`#15803D`) and tinted background (`#F0FDF4`).
  - `Absent`: Selected state gets solid red border (`#DC2626`) and tinted background (`#FEF2F2`).
  - `Excused`: Selected state gets solid amber border (`#D97706`) and tinted background (`#FFFBEB`).

### 2. Form Inputs & Controls
- **Text Inputs & Dropdowns**: Background `#FFFFFF`, border `1px solid #E5E5E5`, corner radius `6px`, padding `10px 12px`, text color `#171717`. Placeholder `#A3A3A3`. On focus: border becomes `#F47F36` with a soft ring (`0 0 0 3px rgba(244, 127, 54, 0.15)`).
- **Checkboxes & Radios**: 18px by 18px box, radius `4px` (checkbox) or circular (radio), border `1.5px solid #D4D4D4`. Checked state fills `#F47F36` with white checkmark icon.

### 3. Cards & Panels
- **Container Structure**: Surface `#FFFFFF`, border `1px solid #E5E5E5`, border radius `8px`, inner padding `16px` (mobile) to `24px` (desktop).
- **Card Header**: Flexbox layout with title (`headline-sm`), contextual action menu or pill tag, separated by an optional hairline border `#E5E5E5`.

### 4. Status Badges & Chips
- **Wellbeing Indicator**:
  - `Doing well`: Background `#F0FDF4`, border `1px solid #BBF7D0`, text `#15803D`. Accompanied by an upward micro trend icon.
  - `Needs attention`: Background `#FFFBEB`, border `1px solid #FDE68A`, text `#D97706`. Accompanied by a steady horizontal icon.
  - `At risk`: Background `#FEF2F2`, border `1px solid #FECACA`, text `#DC2626`. Accompanied by a drop alert icon.
- **Rule of Display**: Color must never be used alone. Every status badge must include explicit text labels to satisfy accessibility criteria (NF-U3).

### 5. Offline Sync Status Bar
- Fixed pill banner or persistent header badge showing network connectivity status:
  - **Online & Synced**: Subtle text `Online`, green micro dot (`#15803D`).
  - **Offline Active**: Amber badge (`#FFFBEB` background, `#D97706` text), displaying unsynced queue: `"Offline • 14 records pending sync"`. Features an immediate manual trigger button: `"Sync Now"`.

### 6. Member Journey Milestone Tracker
- A linear progress component visualizing the 7 core milestones:
  - Completed steps: Circular node `#F47F36` with white checkmark, connecting bar `#F47F36`.
  - Next pending step: Circular node with 2px border `#F47F36`, hollow center.
  - Unreached steps: Node `#E5E5E5` with `#A3A3A3` text, connecting bar `#E5E5E5`.

### 7. Data Lists & Roster Tables
- **Rows**: Alternating subtle hover state (`#FAFAFA`), clean bottom border `1px solid #E5E5E5`. 
- **Columns**: Aligned strictly by data type—text left-aligned, status badges centered, numerical rates/attendance tallies right-aligned with tabular numerals.