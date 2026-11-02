# Design: ERP Documentaire

The locked system. Every Hallmark run reads this first and pages share it. Change it on purpose; the file is the rule.

## System
- Genre: atmospheric
- Shape of the first page: app screen
- Theme: Ribbon (by request)
- Axes: dark/grotesk-sans/chromatic-teal · posture: committed · dial: two-in-the-morning

## Tokens
`src/app/tokens.css` is the source of truth. The roles:
```css
:root {
  --color-paper: oklch(13.2% 0.022 258);  --color-paper-2: oklch(16.4% 0.02 258);  --color-paper-3: oklch(20% 0.018 258);
  --color-ink: oklch(93.5% 0.012 85);  --color-ink-2: oklch(84% 0.014 255);  --color-muted: oklch(72% 0.02 255);  --color-rule: oklch(27% 0.016 258);
  --color-accent: oklch(82% 0.095 68);  --color-accent-ink: oklch(20% 0.03 62);  --color-focus: oklch(82% 0.095 68);
  --font-display: "Instrument Sans", ui-sans-serif, system-ui, sans-serif;  --font-body: "Figtree", ui-sans-serif, system-ui, sans-serif;  --font-outlier: "JetBrains Mono", ui-monospace, monospace;
  --radius-card: 20px;  --radius-pill: 999px;  --rule-hair: 1px;  --shadow-card: none;
}
```
The spacing scale, the type scale, the easings and the durations are the scaffold's and live in `tokens.css`.

## Controls
- Primary: amber lit pill · `--radius-pill` · 36–52px
- Secondary: hairline outline on paper-2 · same radius and height

## Motion
- Character: calm; widget stagger (`ribbon-widget-in`), empty-state level fills, soft pulse; login rain loop; all paused under reduced motion.

## Exports
`src/app/tokens.css` in this project. shadcn bridges through `--background` / `--primary` aliases in `globals.css`.
