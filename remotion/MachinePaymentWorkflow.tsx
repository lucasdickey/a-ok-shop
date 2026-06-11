import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { COLORS } from './theme';
import {
  Intro,
  Outro,
  StepChallenge,
  StepConfirm,
  StepDiscover,
  StepMintSPT,
  StepPayment,
  StepPurchase,
  StepRetry,
} from './scenes';

/** Scene timeline (in frames @ 30fps). Order = MPP request→payment flow. */
const SCENES: { Comp: React.FC; duration: number }[] = [
  { Comp: Intro, duration: 100 },
  { Comp: StepDiscover, duration: 150 },
  { Comp: StepPurchase, duration: 130 },
  { Comp: StepChallenge, duration: 165 },
  { Comp: StepMintSPT, duration: 150 },
  { Comp: StepRetry, duration: 135 },
  { Comp: StepPayment, duration: 165 },
  { Comp: StepConfirm, duration: 160 },
  { Comp: Outro, duration: 140 },
];

export const MPP_DURATION = SCENES.reduce((sum, s) => sum + s.duration, 0);

export const MachinePaymentWorkflow: React.FC = () => {
  let cursor = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {SCENES.map(({ Comp, duration }, i) => {
        const from = cursor;
        cursor += duration;
        return (
          <Sequence key={i} from={from} durationInFrames={duration} name={Comp.name}>
            <Comp />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
