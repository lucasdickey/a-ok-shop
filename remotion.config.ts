/**
 * Remotion configuration for the Machine Payment Protocol workflow video.
 * Used by `npm run remotion:studio` and `npm run remotion:render`.
 * @see https://www.remotion.dev/docs/config
 */
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setEntryPoint('./remotion/index.ts');
