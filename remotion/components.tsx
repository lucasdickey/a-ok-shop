import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from 'remotion';
import { ACTORS, ActorKey, COLORS, FONTS, VIDEO } from './theme';

/**
 * Persistent stage: gradient background, subtle grid, the three actor
 * headers and their vertical "lifelines" (sequence-diagram style).
 */
export const Stage: React.FC<{
  children?: React.ReactNode;
  active?: ActorKey[];
}> = ({ children, active = [] }) => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 700px at 50% -10%, ${COLORS.bgGradientTop}, ${COLORS.bgGradientBottom})`,
        fontFamily: FONTS.sans,
      }}
    >
      <GridBackdrop />
      <Lifelines active={active} />
      <ActorHeaders active={active} />
      {children}
    </AbsoluteFill>
  );
};

const GridBackdrop: React.FC = () => {
  const lines: React.ReactNode[] = [];
  const step = 80;
  for (let x = 0; x <= VIDEO.width; x += step) {
    lines.push(
      <line key={`v${x}`} x1={x} y1={0} x2={x} y2={VIDEO.height} stroke={COLORS.grid} strokeWidth={1} />
    );
  }
  for (let y = 0; y <= VIDEO.height; y += step) {
    lines.push(
      <line key={`h${y}`} x1={0} y1={y} x2={VIDEO.width} y2={y} stroke={COLORS.grid} strokeWidth={1} />
    );
  }
  return (
    <svg
      width={VIDEO.width}
      height={VIDEO.height}
      style={{ position: 'absolute', inset: 0, opacity: 0.5 }}
    >
      {lines}
    </svg>
  );
};

const HEADER_Y = 150;
const LIFELINE_TOP = HEADER_Y + 70;
const LIFELINE_BOTTOM = VIDEO.height - 170;

const Lifelines: React.FC<{ active: ActorKey[] }> = ({ active }) => {
  return (
    <svg width={VIDEO.width} height={VIDEO.height} style={{ position: 'absolute', inset: 0 }}>
      {(Object.keys(ACTORS) as ActorKey[]).map((key) => {
        const a = ACTORS[key];
        const isActive = active.includes(key);
        return (
          <line
            key={key}
            x1={a.x}
            y1={LIFELINE_TOP}
            x2={a.x}
            y2={LIFELINE_BOTTOM}
            stroke={a.color}
            strokeWidth={isActive ? 3 : 1.5}
            strokeDasharray="2 10"
            strokeLinecap="round"
            opacity={isActive ? 0.8 : 0.28}
          />
        );
      })}
    </svg>
  );
};

const ActorHeaders: React.FC<{ active: ActorKey[] }> = ({ active }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {(Object.keys(ACTORS) as ActorKey[]).map((key, i) => {
        const a = ACTORS[key];
        const enter = spring({ frame: frame - i * 6, fps, config: { damping: 200 } });
        const isActive = active.includes(key);
        const glow = isActive
          ? `0 0 0 2px ${a.color}, 0 0 38px ${a.color}66`
          : `0 0 0 1px ${COLORS.panelBorder}`;
        return (
          <div
            key={key}
            style={{
              position: 'absolute',
              left: a.x,
              top: HEADER_Y,
              transform: `translate(-50%, -50%) translateY(${(1 - enter) * -28}px)`,
              opacity: enter,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px 26px',
              borderRadius: 18,
              background: COLORS.panel,
              boxShadow: glow,
              transition: 'box-shadow 0.2s',
            }}
          >
            <div style={{ fontSize: 40 }}>{a.icon}</div>
            <div>
              <div style={{ fontSize: 30, fontWeight: 700, color: COLORS.text, lineHeight: 1.1 }}>
                {a.label}
              </div>
              <div style={{ fontSize: 17, color: a.color, fontWeight: 600 }}>{a.sub}</div>
            </div>
          </div>
        );
      })}
    </>
  );
};

/**
 * An animated message packet that travels from one actor lifeline to another
 * along a horizontal track at a given vertical position.
 */
export const Packet: React.FC<{
  from: ActorKey;
  to: ActorKey;
  y: number;
  label: string;
  color: string;
  /** local frame at which the packet should be fully delivered */
  startFrame?: number;
  travel?: number;
}> = ({ from, to, y, label, color, startFrame = 10, travel = 26 }) => {
  const frame = useCurrentFrame();
  const x1 = ACTORS[from].x;
  const x2 = ACTORS[to].x;
  const progress = interpolate(frame, [startFrame, startFrame + travel], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });
  const x = interpolate(progress, [0, 1], [x1, x2]);
  const dir = x2 >= x1 ? 1 : -1;
  const lineDraw = interpolate(frame, [startFrame, startFrame + travel], [0, Math.abs(x2 - x1)], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const appear = interpolate(frame, [startFrame - 6, startFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <>
      <svg width={VIDEO.width} height={VIDEO.height} style={{ position: 'absolute', inset: 0 }}>
        <line
          x1={x1}
          y1={y}
          x2={x1 + dir * lineDraw}
          y2={y}
          stroke={color}
          strokeWidth={3}
          opacity={0.55}
          strokeLinecap="round"
        />
        <polygon
          points={`${x},${y - 9} ${x + dir * 16},${y} ${x},${y + 9}`}
          fill={color}
          opacity={appear}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y - 46,
          transform: 'translateX(-50%)',
          opacity: appear,
          padding: '6px 16px',
          borderRadius: 999,
          background: `${color}1f`,
          border: `1.5px solid ${color}`,
          color: COLORS.text,
          fontFamily: FONTS.mono,
          fontSize: 19,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          boxShadow: `0 0 22px ${color}44`,
        }}
      >
        {label}
      </div>
    </>
  );
};

/**
 * A card that renders an HTTP request or response with a syntax-highlighted
 * payload snippet.
 */
export const HttpCard: React.FC<{
  x: number;
  y: number;
  kind: 'request' | 'response';
  title: string;
  status?: string;
  statusColor?: string;
  lines: string[];
  accent: string;
  delay?: number;
  width?: number;
}> = ({ x, y, kind, title, status, statusColor, lines, accent, delay = 0, width = 620 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.7 } });
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        transform: `translate(-50%, 0) scale(${interpolate(enter, [0, 1], [0.92, 1])})`,
        opacity: enter,
        background: 'linear-gradient(180deg, #161e29, #111722)',
        border: `1px solid ${COLORS.panelBorder}`,
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: `0 24px 60px #00000066, 0 0 0 1px ${accent}22`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 22px',
          background: `${accent}14`,
          borderBottom: `1px solid ${COLORS.panelBorder}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 1.5,
              color: accent,
              textTransform: 'uppercase',
            }}
          >
            {kind}
          </span>
          <span style={{ fontFamily: FONTS.mono, fontSize: 22, color: COLORS.text, fontWeight: 600 }}>
            {title}
          </span>
        </div>
        {status ? (
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 20,
              fontWeight: 800,
              color: statusColor ?? accent,
              padding: '4px 12px',
              borderRadius: 8,
              background: `${statusColor ?? accent}1f`,
              border: `1px solid ${statusColor ?? accent}`,
            }}
          >
            {status}
          </span>
        ) : null}
      </div>
      <div style={{ padding: '18px 24px' }}>
        {lines.map((ln, i) => {
          const lineEnter = interpolate(frame, [delay + 6 + i * 3, delay + 12 + i * 3], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div
              key={i}
              style={{
                fontFamily: FONTS.mono,
                fontSize: 21,
                lineHeight: 1.65,
                color: ln.startsWith('//') ? COLORS.textDim : COLORS.text,
                opacity: lineEnter,
                whiteSpace: 'pre',
              }}
            >
              {ln}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Bottom caption bar with step number and description. */
export const Caption: React.FC<{
  step: number;
  total: number;
  title: string;
  body: string;
  accent: string;
}> = ({ step, total, title, body, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 56,
        display: 'flex',
        justifyContent: 'center',
        opacity: enter,
        transform: `translateY(${(1 - enter) * 24}px)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          padding: '18px 30px',
          maxWidth: 1500,
          borderRadius: 18,
          background: '#0e141dcc',
          border: `1px solid ${COLORS.panelBorder}`,
          backdropFilter: 'blur(6px)',
        }}
      >
        <div
          style={{
            flex: '0 0 auto',
            width: 64,
            height: 64,
            borderRadius: 14,
            background: `${accent}1f`,
            border: `1.5px solid ${accent}`,
            color: accent,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
          }}
        >
          <span style={{ fontSize: 26, lineHeight: 1 }}>{step}</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>/{total}</span>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.text }}>{title}</div>
          <div style={{ fontSize: 22, color: COLORS.textDim, marginTop: 2 }}>{body}</div>
        </div>
      </div>
    </div>
  );
};

/** Progress dots along the top showing how far through the flow we are. */
export const ProgressRail: React.FC<{ step: number; total: number }> = ({ step, total }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 36,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const done = i < step;
        const current = i === step - 1;
        return (
          <div
            key={i}
            style={{
              width: current ? 46 : 22,
              height: 8,
              borderRadius: 999,
              background: done ? COLORS.accent : COLORS.panelBorder,
              boxShadow: current ? `0 0 16px ${COLORS.accent}` : 'none',
              transition: 'all 0.2s',
            }}
          />
        );
      })}
    </div>
  );
};

export const CENTER_Y = 360;
