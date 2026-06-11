/**
 * Shared visual theme for the Machine Payment Protocol (MPP) workflow video.
 *
 * Kept dependency-free (system fonts only) to honor the project's
 * "as few packages as possible" guidance.
 */

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

export const COLORS = {
  bg: '#0a0e14',
  bgGradientTop: '#10161f',
  bgGradientBottom: '#070a0f',
  panel: '#131a24',
  panelBorder: '#1f2a38',
  grid: '#141c27',
  text: '#e6edf3',
  textDim: '#8b98a5',
  // Actor accents
  agent: '#7c5cff', // AI agent / buyer — violet
  server: '#22d3ee', // a-ok.shop MPP server — cyan
  stripe: '#a3e635', // Stripe — lime
  // Semantic
  warn: '#f59e0b', // 402 Payment Required
  success: '#34d399', // 200 OK
  danger: '#f87171',
  accent: '#22d3ee',
} as const;

export const FONTS = {
  sans: '"Helvetica Neue", Helvetica, Arial, system-ui, sans-serif',
  mono: '"SF Mono", "Roboto Mono", Menlo, Consolas, "Courier New", monospace',
} as const;

// Horizontal positions (x, in px) of the three actor lifelines.
export const LANES = {
  agent: VIDEO.width * 0.18,
  server: VIDEO.width * 0.5,
  stripe: VIDEO.width * 0.82,
} as const;

export type ActorKey = 'agent' | 'server' | 'stripe';

export const ACTORS: Record<
  ActorKey,
  { label: string; sub: string; color: string; x: number; icon: string }
> = {
  agent: {
    label: 'AI Agent',
    sub: 'Autonomous buyer',
    color: COLORS.agent,
    x: LANES.agent,
    icon: '🤖',
  },
  server: {
    label: 'a-ok.shop',
    sub: 'MPP merchant server',
    color: COLORS.server,
    x: LANES.server,
    icon: '🛍️',
  },
  stripe: {
    label: 'Stripe',
    sub: 'Payments + SPT wallet',
    color: COLORS.stripe,
    x: LANES.stripe,
    icon: '💳',
  },
};
