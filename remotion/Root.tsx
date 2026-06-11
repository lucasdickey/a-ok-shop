import React from 'react';
import { Composition } from 'remotion';
import { VIDEO } from './theme';
import { MachinePaymentWorkflow, MPP_DURATION } from './MachinePaymentWorkflow';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MachinePaymentWorkflow"
      component={MachinePaymentWorkflow}
      durationInFrames={MPP_DURATION}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  );
};
