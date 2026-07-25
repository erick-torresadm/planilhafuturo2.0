## Redesign da Landing Page — Fintech Dark / Motion-heavy

Vou reconstruir a `/` (e as seções compartilhadas) com a cara de uma fintech moderna tipo Stripe/Ramp/Mercury/Linear, mantendo escopo restrito à landing page (produto interno em `/app` fica intacto).

### 1. Design tokens (src/styles.css)

Paleta **Neon Mint Dark** aplicada só à LP via classe `.lp-dark` no wrapper (não muda o produto):
- `--lp-bg: #05100a` (quase preto, tinta verde)
- `--lp-surface: #0d1b2a`
- `--lp-surface-2: #1b4332`
- `--lp-border: rgba(115,255,184,0.12)`
- `--lp-primary: #2dd4a8`
- `--lp-primary-glow: #73ffb8`
- `--lp-text: #e6faf1`
- `--lp-muted: #7a9088`
- Gradientes: `--lp-gradient-mint`, `--lp-gradient-glow`, `--lp-noise` (grão sutil).

### 2. Tipografia (fintech tech moderna)

Pesquisei o padrão que Vercel/Linear/Ramp/Stripe usam. Vou combinar:
- **Headings:** `Space Grotesk` (geométrica, tech, muito usada em fintech 2024–2026)
- **Body:** `Inter` (já carregado, neutro)
- **Números/dados:** `JetBrains Mono` para preços, KPIs, contadores animados — reforça o ar terminal/dados.

Fontes carregadas via `<link>` em `__root.tsx` (regra Tailwind v4).

### 3. Estrutura Full-width Sections

Todas as seções ocupam a largura toda, empilhadas em bandas cinematográficas com transições suaves entre elas:

```text
┌──────────────────────────────────────────┐
│ NAV translúcida (blur + border mint)     │
├──────────────────────────────────────────┤
│ HERO: eyebrow pill + headline gigante    │
│  gradient mint, sub, dois CTAs, mockup   │
│  da planilha flutuando com parallax      │
├──────────────────────────────────────────┤
│ LOGO CLOUD / social proof scrolling      │
├──────────────────────────────────────────┤
│ FEATURES: 3 bandas horizontais alternadas│
│  com números grandes 01/02/03 mono       │
├──────────────────────────────────────────┤
│ PRODUCT SHOWCASE: mockup animado grande  │
│  com highlights que aparecem ao scroll   │
├──────────────────────────────────────────┤
│ COMPARE (planilha caseira vs futuro)     │
├──────────────────────────────────────────┤
│ STEPS (E-S-D-E-C badges animados)        │
├──────────────────────────────────────────┤
│ DEPOIMENTOS (colunas em loop — mantém)   │
├──────────────────────────────────────────┤
│ PRICING (3 tiers, Vitalício em destaque) │
├──────────────────────────────────────────┤
│ PLANILHA OFFER + FAQ + CTA final         │
├──────────────────────────────────────────┤
│ FOOTER dark                              │
└──────────────────────────────────────────┘
```

### 4. Motion design (motion/react já instalado)

Camadas de animação — respeitando `useReducedMotion`:
- **Grid animado** de fundo no hero (linhas mint pulsando lentamente, CSS puro).
- **Gradient orbs** flutuando com blur atrás do headline (2 blobs, animação infinita 20s).
- **Headline com stagger** — palavra por palavra fade + slide-up.
- **Ticker numérico** no hero mostrando "R$ +3.240" contando (usa `useMotionValue` + `animate`).
- **Scroll-triggered reveals** em cada seção (`whileInView`, `once: true`, spring soft).
- **Parallax leve** no mockup da planilha (rotate 3D no `mouseMove`, ~5°).
- **Marquee** infinito na logo cloud e nos depoimentos.
- **Cards com hover glow** — border mint acende + leve translate-y.
- **Section dividers** com linha mint que desenha ao entrar na viewport (`pathLength`).
- **Pricing card destacado** com aura pulsante (box-shadow animado).
- **CTA final** com botão magnético (segue o cursor levemente).

### 5. Componentes novos

- `src/components/lp/HeroGrid.tsx` — grid SVG animado de fundo.
- `src/components/lp/GradientOrbs.tsx` — blobs de gradient.
- `src/components/lp/AnimatedNumber.tsx` — contador com JetBrains Mono.
- `src/components/lp/MagneticButton.tsx` — CTA que segue cursor.
- `src/components/lp/MarqueeRow.tsx` — logo/tag cloud infinito.
- `src/components/lp/SheetMockup.tsx` — mockup 3D da planilha com parallax e highlights animados.
- `src/components/lp/SectionReveal.tsx` — wrapper de reveal padrão.

### 6. Arquivos alterados

- `src/styles.css` — tokens `.lp-dark`, keyframes (grid-pulse, orb-float, marquee, glow-pulse), utility `@utility lp-glow`.
- `src/routes/__root.tsx` — `<link>` Space Grotesk + JetBrains Mono.
- `src/routes/index.tsx` — reescrita completa das seções Nav/Hero/SocialProof/Features/Compare/Steps/Pricing/PlanilhaOffer/Faq/Cta/Footer usando os novos componentes e tokens `lp-*`.
- `src/routes/pv2.tsx` — aplica a mesma paleta e motion design (mantém copy VSL).
- `src/components/Testimonials.tsx` — ajusta cores para o dark mint.

### 7. Fora de escopo

- Rotas do produto (`/app`, `/fluxo`, `/produtividade`, `/auth`, `/docs`) permanecem no tema atual claro. O `.lp-dark` isola a paleta na LP.
- Sem mudança de copy, preços ou lógica — só visual + motion.
- Sem novas dependências (usa `motion/react` que já existe).

### 8. Detalhes técnicos importantes

- Fontes via `<link>` no `__root.tsx` — nunca `@import` URL no styles.css (regra Tailwind v4).
- Tokens novos vão em `:root .lp-dark { ... }` + registrados em `@theme inline` como `--color-lp-*` pra habilitar `bg-lp-primary`, `text-lp-text`, etc.
- Todas as animações checam `useReducedMotion()` antes de rodar loops infinitos.
- Nenhuma cor hex hardcoded nos componentes — só classes semânticas `lp-*`.
- Responsivo: mobile pega grid simplificado, orbs menores, parallax desligado no touch.
