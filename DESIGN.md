---
version: alpha
name: TOAO-design-system
description: |
  TOAO (The One And Only) is Owen's AI operations agency for service
  businesses in South Florida: websites, 24/7 voice agents, private document
  AI, AI-run paid ads, custom dashboards and software. The pitch is not a
  menu: one team audits the whole business once and closes every gap. The design language is warm near-black, one signal-orange accent that
  reads as "answered call" rather than AI-purple, Bricolage Grotesque for
  every word and Geist Mono for labels and numbers only. Double-bezel
  enclosures, full-pill buttons with a nested trailing icon, film grain at
  3.5%, sections that breathe 88 to 150px. The hero is a full-bleed
  Higgsfield video under a left-side dark gradient with glass copy; the
  working console demo sits in its own section right after it. Every number on the page
  is checkable. No invented reviews, clients or years in business. No
  em-dashes anywhere.

colors:
  canvas: "#0a0908"
  surface: "#121110"
  raised: "#1a1815"
  well: "#070605"
  ink: "#f3efe8"
  muted: "#a8a196"
  dim: "#6f695f"
  hairline: "rgba(255,255,255,0.08)"
  hairline-strong: "rgba(255,255,255,0.14)"
  accent: "#ff5a1f"
  accent-bright: "#ff7a47"
  accent-ink: "#1a0a03"
  accent-wash: "rgba(255,90,31,0.08)"
  accent-glow: "rgba(255,90,31,0.22)"
  success: "#3ddc84"

typography:
  display: "Bricolage Grotesque (opsz 12..96, wght 400..700)"
  body: "Bricolage Grotesque"
  mono: "Geist Mono"
  fallback: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"

radius:
  pill: "999px"
  card: "28px"
  card-inner: "22px"
  medium: "16px"
  small: "10px"

motion:
  ease: "cubic-bezier(0.32, 0.72, 0, 1)"
  spring: "cubic-bezier(0.34, 1.4, 0.64, 1)"
  micro: "150-350ms"
  reveal: "700-800ms"
---

# TOAO Design System

## Overview

Dark, warm, direct. The page should feel like a well-built tool, not a
brochure: near-black with a warm tint (not blue-black, that is She Trades),
cream ink, and a single orange that only appears where something is live,
booked, or clickable. The voice is Owen's brand voice from the playbook:
peer-level, numbers-grounded, shows the work, no guru posturing.

## Logo

- Mark: a T set inside an O ring (viewBox 64: ring r=26 stroke 5 in accent,
  T in ink). Reads as "T in O" = TOAO and as "the one" in a circle. Used at
  26px in the nav, as the favicon on a rounded canvas tile, and scales to
  print. Wordmark: TOAO in Bricolage 700 with .08em tracking, the first O in
  accent. Never stretch the mark; never put the ring on orange.

## Colors

- Canvas `#0a0908` everywhere. Surfaces step up by 4 to 8 points of
  lightness, never by hue.
- Orange `#ff5a1f` is the only chromatic accent. Use it for the H1 emphasis
  word, live chips, step numbers, check marks, the flagship card wash and
  the hover state of the nested button icon. Never for large fills.
- Green `#3ddc84` is reserved for outcomes: booked, secure, score numbers.
- Text: ink for headings and list items, muted for body, dim for notes.
  Muted on canvas is 7.9:1, dim (#8b857a) on canvas is 5.2:1 so even the
  9px mono labels pass; do not go darker. Lighthouse mobile on the home
  page: 100 accessibility, 100 best practices, 100 SEO (2026-09-10).

## Typography

- Bricolage Grotesque carries display and body through the optical-size
  axis. H1 at 700, `letter-spacing -.035em`, `line-height .98`. H2 at 600,
  `-.03em`. Body 17px / 1.6 at 400.
- Geist Mono is for eyebrows, chips, step numbers, prices' subtitles and
  file paths. Uppercase with 0.1 to 0.18em tracking, 0.62 to 0.78rem.
- Two families, no more. Do not add a serif "for warmth".

## Layout

- Container 1180px, gutter `clamp(20px, 5vw, 56px)`.
- Section rhythm `clamp(88px, 11vw, 150px)`.
- Split sections are `1fr 1.25fr`; the heading owns the left column and
  stays short (under 20ch).
- Services are "the twelve" grouped into five stages (Get found, Get
  answered, Get booked and priced, Grow and get paid, Know and own it), a
  pinned horizontal track on desktop with a Stage 01/05 meter; each stage
  panel holds two or three system tiles with a line glyph. Below 900px the
  stages stack vertically.
- Booking is a real calendar (book.js, book.css): a three-step card with a
  sidebar (who, length, steps, summary), month grid with "has openings"
  dots, times grouped Afternoon/Evening, a time-zone picker and a "Next
  available" jump. Windows: every day 2:30 to 5:30 PM Eastern (Thu 2:30-4:00
  and 4:15-5:30) plus Mon 6:15 to 7:15, 15-minute slots. Owen is available
  seven days a week. With booking/Code.gs deployed as an Apps Script web app and its URL
  in BOOKING_ENDPOINT, it reads busy times and creates the event with the
  visitor as guest; without it, it emails the exact slot. Both land on
  booked.html, the success page.
- Three flagships (Website, Voice, Private AI) are sticky stacking cards;
  the Website card shows this page's own stats measured live in the
  visitor's browser (kB, requests, ms, third-party hosts).
- No prices on the page (Owen, 2026-09-10). The "engage" card says: audit
  free, everything after quoted against it, you own all of it.
- The nav is a floating pill, detached from the top, blurred. Below 760px
  it collapses to a hamburger that morphs to an X and opens a full-screen
  staggered menu.

## Elevation

- Double bezel on every card, plan, portrait and the console: outer shell
  `rgba(255,255,255,.035)` with a hairline and 28px radius, 6px padding;
  inner core `surface` with 22px radius and a 1px inset highlight.
- Shadows are only deep, diffuse, and dark: `0 40px 80px -40px rgba(0,0,0,.8)`.
  No mid-grey drop shadows.
- Film grain is a fixed, pointer-events-none overlay at 3.5% opacity.

## Components

- Button: full pill, ink on canvas, 48px min height, trailing icon nested in
  its own 32px circle. On hover the button lifts 2px and the icon circle
  moves diagonally and turns orange. Ghost variant is hairline only.
- Chip: mono uppercase, hairline pill. `chip-ok` green, `chip-live` orange.
- Checks list: custom orange ring plus tick, never an emoji or icon font.
- Motion set pieces (motion.css + motion.js, GSAP self-hosted in assets/):
  top progress line, hero parallax, pinned statement with word-by-word
  fill, drawn line beside the leaks, the horizontal journey, stacking
  flagships, portrait parallax, magnetic buttons. All skipped under
  reduced motion; html scroll-behavior stays auto so pins measure right.
  Never name a helper class `.acc`: it is the FAQ accordion.
- Demo section: two columns, a "what just happened" step list on the left
  that lights up in sync with the console on the right (site.js STEPS).
  Transcript bubbles carry speaker labels and scroll inside the pane; a
  waveform shows while the call is live.
- Console (hero): tabbed demo with three panes. Voice pane types a
  transcript; Website pane counts Lighthouse-style scores; Private AI pane
  types a question and shows a cited answer. Auto-cycles until the visitor
  clicks a tab. All of it is honest: chips say "demo", the business is
  fictional, and the scores are the ones our real builds achieve.
- FAQ: native `details`, one open at a time, plus-to-cross toggle.
- Form: labelled inputs, 48px tall, orange focus ring. Submit composes a
  mailto to owen@toao.app until a real backend exists.

## The ads chapter (02)

- The one inverted chapter on the site: cream canvas (#f3efe8), ink text,
  same orange. It re-scopes the tokens on `.ads`, so bezels, buttons and
  checks flip with it. The fixed nav switches to solid dark over it
  (`.nav.on-light`, toggled by an IntersectionObserver in site.js).
- Contents, in order: chapter opener (h-xl), the ad-dollar tracer (five
  nodes, four toggles, no invented percentages, only where the dollar dies),
  three columns (creative, the daily loop timeline with a scroll-drawn line,
  the five-number report as a demo layout), what stays yours / what we will
  not do, two CTAs. Ads is also the default console tab and the first
  flagship. Everything else on the page follows in the money order.
- Hero carries an inline auditor form that submits to
  resources/website-audit.html?url=; the auditor runs on arrival.

## Interactives

- Missed-call calculator (interact.js, resources/missed-call.html): four sliders, every output is
  arithmetic on the visitor's inputs. Never seed it with an industry stat.
- Leak finder: the five leaks are toggles; the sticky heading column shows
  "Start at stage 0X" from a fixed priority (phone > site > ads > files).
- Pointer tilt on the system tiles, desktop only, off under reduced motion.
- Artwork: keep it sparse (Owen, 2026-09-10: "too many visuals, some don't
  represent them"). Only the hero video and the three flagship stills
  (flag-site/voice/ai) remain; the stage backdrops were removed. Resource
  cards use glyphs, not photos.

## Pages

- `resources/index.html`, `resources/website-audit.html` (the auditor,
  audit.js), `resources/missed-call.html`, `privacy.html`, `terms.html`,
  `booked.html` (noindex), `404.html` (root-relative links, served by GitHub
  Pages for any missing path), `robots.txt`, `sitemap.xml`. No blog (Owen,
  2026-09-10): free tools instead of posts.
  Inner pages share the nav and four-column footer by copy (no build
  step); when the nav or footer changes, change it in every file. Layout
  for inner pages and the home "More from TOAO" section lives in page.css.
- Website auditor: fetches the homepage once (Apps Script `action=audit`
  when AUDIT_ENDPOINT is set, else the allorigins relay, labelled on the
  page), scores six dials from checks a person can repeat (HTTPS, weight
  and script count, viewport tag, tappable phone, form or email, copyright
  year, jQuery 1.x, legacy tags, one h1, meta description, licence number),
  then renders a light-theme homepage in a sandboxed iframe using only
  the site's own headline, description, services, phone, address and
  licence. Missing blocks are omitted, never invented.
- Policies are practice statements, not legal advice; both carry a line
  saying so and a "last updated" date at the top of the prose.

## Do's and Don'ts

- Do keep every number checkable. Lighthouse 100 accessibility and best
  practices are real results from our shipped builds; page weight under
  45 kB is real. Do not add testimonials, client logos, star ratings or
  "trusted by" strips until there are real ones.
- Do not name clients, partners or the e-commerce company Owen works for.
  Location stays "South Florida" or "Boca", never narrower.
- Do not use AI purple or blue gradients. Do not use Inter, Roboto or
  Arial. No fake avatars, no "join 1M+" style numbers; the hero pill states
  a fact ("Now booking free audits").
- No em-dashes. Use a full stop, a comma or a colon.
- Do not animate the hero copy on load. Only the console animates, and only
  once it is on screen.

## Responsive

- 1020px: hero stacks, console goes full width, cards go 2-up, plans stack.
- 760px: single column everywhere, hamburger nav, scores 2-up, form 1-up.
- Reduced motion: reveals are instant, the console renders its final state
  with no typing, the menu opens without stagger.

## Iteration guide

- New section: eyebrow, then a short H2 (under 22ch), then content in the
  right column. Copy in Owen's voice: short sentences, a fact first.
- New card: wrap in `.bezel > .bezel-in`, never a bare bordered box.
- New number: it must be sourced. Put the source in a comment next to it.

## Audit baseline (2026-09-12)

Lighthouse mobile, every public page: 100 accessibility, 100 best
practices, 100 SEO, 100 agentic. booked.html scores 60 on SEO only because
it is deliberately noindex. Zero console errors on a fresh load, zero broken
internal links or anchors across 8 pages, zero third-party requests, LCP
148 ms and CLS 0 on an unthrottled local load. Re-run after any structural
change: link checker (python, see Live Log 2026-09-12), chrome-devtools
lighthouse_audit, and the web-interface-guidelines list.

## Known gaps

- No booking link yet; the CTA lands on the mailto form. Swap `#contact`
  targets to a calendar URL when one exists.
- OG image is `assets/og.jpg` (1200x630, logo + H1 on canvas). Regenerate by
  rendering a 1200x630 HTML page with the site fonts and screenshotting it.
- Fonts (Bricolage Grotesque latin, Geist Mono) and GSAP 3.13 are
  self-hosted in assets/ so the page has zero third-party requests. Refresh
  them by hand; there is no build step.
