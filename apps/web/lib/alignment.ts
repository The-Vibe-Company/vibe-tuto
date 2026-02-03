/**
 * Alignment algorithm for matching transcription segments to tutorial steps
 * Each step has a timestamp_start (ms) when the action was captured.
 * Segments from Deepgram have start/end times in seconds.
 * We align by finding segments that overlap with each step's time window.
 */

export interface TranscriptionSegment {
  start: number; // seconds
  end: number; // seconds
  transcript: string;
}

export interface Step {
  id: string;
  timestamp_start: number; // milliseconds
}

export interface AlignedStep {
  stepId: string;
  textContent: string;
  timestampEnd: number | null; // milliseconds
}

/**
 * Aligns transcription segments with tutorial steps based on timestamps.
 *
 * Algorithm:
 * - Each step covers the time window from its timestamp to the next step's timestamp
 * - Find all transcription segments that overlap with this window
 * - Concatenate their transcripts as the step's text content
 *
 * @param steps - Array of steps sorted by timestamp_start
 * @param segments - Array of transcription segments from Deepgram
 * @returns Array of aligned steps with text content
 */
export function alignStepsWithTranscription(
  steps: Step[],
  segments: TranscriptionSegment[]
): AlignedStep[] {
  if (steps.length === 0) {
    return [];
  }

  return steps.map((step, index) => {
    // Convert step timestamp from ms to seconds
    const stepTimeSec = step.timestamp_start / 1000;

    // Get next step's timestamp or use Infinity for the last step
    const nextStepTimeSec = steps[index + 1]?.timestamp_start
      ? steps[index + 1].timestamp_start / 1000
      : Infinity;

    // Find all segments that overlap with [stepTime, nextStepTime)
    // A segment overlaps if: segment.start < nextStepTime AND segment.end > stepTime
    const overlappingSegments = segments.filter(
      (seg) => seg.start < nextStepTimeSec && seg.end > stepTimeSec
    );

    // Concatenate transcriptions from overlapping segments
    const textContent = overlappingSegments
      .map((s) => s.transcript)
      .join(' ')
      .trim();

    // Calculate timestamp_end:
    // - If there's a next step, use its timestamp
    // - Otherwise, use the end of the last overlapping segment (converted to ms)
    // - If no segments, return null
    let timestampEnd: number | null = null;
    if (steps[index + 1]) {
      timestampEnd = steps[index + 1].timestamp_start;
    } else if (overlappingSegments.length > 0) {
      const lastSegment = overlappingSegments[overlappingSegments.length - 1];
      timestampEnd = Math.round(lastSegment.end * 1000);
    }

    return {
      stepId: step.id,
      textContent: textContent || '',
      timestampEnd,
    };
  });
}

/**
 * Finds the closest segment to a given timestamp.
 * Useful as a fallback when no segment overlaps with the step.
 *
 * @param timestampSec - Timestamp in seconds
 * @param segments - Array of transcription segments
 * @returns The closest segment or null if no segments
 */
export function findClosestSegment(
  timestampSec: number,
  segments: TranscriptionSegment[]
): TranscriptionSegment | null {
  if (segments.length === 0) {
    return null;
  }

  let closest = segments[0];
  let minDistance = Math.abs(timestampSec - segments[0].start);

  for (const segment of segments) {
    // Check distance to segment start
    const distanceToStart = Math.abs(timestampSec - segment.start);
    if (distanceToStart < minDistance) {
      minDistance = distanceToStart;
      closest = segment;
    }

    // Check distance to segment end
    const distanceToEnd = Math.abs(timestampSec - segment.end);
    if (distanceToEnd < minDistance) {
      minDistance = distanceToEnd;
      closest = segment;
    }
  }

  return closest;
}
