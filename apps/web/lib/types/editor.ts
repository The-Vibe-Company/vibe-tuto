import type { Tables } from '@/lib/supabase/types';

export type Tutorial = Tables<'tutorials'>;
export type Step = Tables<'steps'>;

export interface StepWithSignedUrl extends Step {
  signedScreenshotUrl: string | null;
}

export interface TutorialWithSteps {
  tutorial: Tutorial;
  steps: StepWithSignedUrl[];
}
