import { describe, it, expect } from 'vitest';
import {
  alignStepsWithTranscription,
  findClosestSegment,
  type Step,
  type TranscriptionSegment,
} from './alignment';

describe('alignStepsWithTranscription', () => {
  it('returns empty array for empty steps', () => {
    const result = alignStepsWithTranscription([], []);
    expect(result).toEqual([]);
  });

  it('returns empty text for steps when no segments provided', () => {
    const steps: Step[] = [
      { id: 'step-1', timestamp_start: 1000 },
      { id: 'step-2', timestamp_start: 3000 },
    ];

    const result = alignStepsWithTranscription(steps, []);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      stepId: 'step-1',
      textContent: '',
      timestampEnd: 3000,
    });
    expect(result[1]).toEqual({
      stepId: 'step-2',
      textContent: '',
      timestampEnd: null,
    });
  });

  it('aligns a single segment with a single step', () => {
    const steps: Step[] = [{ id: 'step-1', timestamp_start: 0 }];
    const segments: TranscriptionSegment[] = [
      { start: 0, end: 2.5, transcript: 'Hello world' },
    ];

    const result = alignStepsWithTranscription(steps, segments);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      stepId: 'step-1',
      textContent: 'Hello world',
      timestampEnd: 2500, // end of segment in ms
    });
  });

  it('aligns multiple segments to their respective steps', () => {
    const steps: Step[] = [
      { id: 'step-1', timestamp_start: 0 },
      { id: 'step-2', timestamp_start: 3000 },
      { id: 'step-3', timestamp_start: 6000 },
    ];
    const segments: TranscriptionSegment[] = [
      { start: 0, end: 2.5, transcript: 'First step text' },
      { start: 3.5, end: 5.5, transcript: 'Second step text' },
      { start: 6.5, end: 8, transcript: 'Third step text' },
    ];

    const result = alignStepsWithTranscription(steps, segments);

    expect(result).toHaveLength(3);
    expect(result[0].textContent).toBe('First step text');
    expect(result[1].textContent).toBe('Second step text');
    expect(result[2].textContent).toBe('Third step text');
  });

  it('concatenates multiple segments for a single step', () => {
    const steps: Step[] = [
      { id: 'step-1', timestamp_start: 0 },
      { id: 'step-2', timestamp_start: 10000 },
    ];
    const segments: TranscriptionSegment[] = [
      { start: 0, end: 3, transcript: 'First sentence.' },
      { start: 3.5, end: 6, transcript: 'Second sentence.' },
      { start: 7, end: 9, transcript: 'Third sentence.' },
    ];

    const result = alignStepsWithTranscription(steps, segments);

    expect(result[0].textContent).toBe(
      'First sentence. Second sentence. Third sentence.'
    );
    expect(result[0].timestampEnd).toBe(10000);
  });

  it('handles segments that span multiple steps', () => {
    const steps: Step[] = [
      { id: 'step-1', timestamp_start: 0 },
      { id: 'step-2', timestamp_start: 2000 },
    ];
    const segments: TranscriptionSegment[] = [
      { start: 0, end: 5, transcript: 'This segment spans both steps' },
    ];

    const result = alignStepsWithTranscription(steps, segments);

    // Both steps should get the same segment since it overlaps with both
    expect(result[0].textContent).toBe('This segment spans both steps');
    expect(result[1].textContent).toBe('This segment spans both steps');
  });

  it('handles gaps in transcription (silence)', () => {
    const steps: Step[] = [
      { id: 'step-1', timestamp_start: 0 },
      { id: 'step-2', timestamp_start: 5000 }, // No speech during this step
      { id: 'step-3', timestamp_start: 10000 },
    ];
    const segments: TranscriptionSegment[] = [
      { start: 0, end: 3, transcript: 'First step' },
      { start: 10.5, end: 12, transcript: 'Third step' },
    ];

    const result = alignStepsWithTranscription(steps, segments);

    expect(result[0].textContent).toBe('First step');
    expect(result[1].textContent).toBe(''); // No text for step 2
    expect(result[2].textContent).toBe('Third step');
  });

  it('correctly sets timestampEnd for intermediate steps', () => {
    const steps: Step[] = [
      { id: 'step-1', timestamp_start: 0 },
      { id: 'step-2', timestamp_start: 3000 },
      { id: 'step-3', timestamp_start: 6000 },
    ];
    const segments: TranscriptionSegment[] = [
      { start: 0, end: 10, transcript: 'Long segment' },
    ];

    const result = alignStepsWithTranscription(steps, segments);

    expect(result[0].timestampEnd).toBe(3000); // Next step timestamp
    expect(result[1].timestampEnd).toBe(6000); // Next step timestamp
    expect(result[2].timestampEnd).toBe(10000); // End of segment
  });

  it('handles steps starting after all segments end', () => {
    const steps: Step[] = [
      { id: 'step-1', timestamp_start: 0 },
      { id: 'step-2', timestamp_start: 20000 }, // After all segments
    ];
    const segments: TranscriptionSegment[] = [
      { start: 0, end: 5, transcript: 'Early text' },
    ];

    const result = alignStepsWithTranscription(steps, segments);

    expect(result[0].textContent).toBe('Early text');
    expect(result[1].textContent).toBe(''); // No overlapping segment
  });

  it('performs well with many steps', () => {
    // Generate 50 steps
    const steps: Step[] = Array.from({ length: 50 }, (_, i) => ({
      id: `step-${i}`,
      timestamp_start: i * 1000,
    }));

    // Generate 50 segments
    const segments: TranscriptionSegment[] = Array.from({ length: 50 }, (_, i) => ({
      start: i,
      end: i + 0.8,
      transcript: `Segment ${i}`,
    }));

    const start = performance.now();
    const result = alignStepsWithTranscription(steps, segments);
    const duration = performance.now() - start;

    expect(result).toHaveLength(50);
    expect(duration).toBeLessThan(100); // Should complete in < 100ms
  });
});

describe('findClosestSegment', () => {
  it('returns null for empty segments', () => {
    const result = findClosestSegment(5, []);
    expect(result).toBeNull();
  });

  it('finds the closest segment by start time', () => {
    const segments: TranscriptionSegment[] = [
      { start: 0, end: 2, transcript: 'First' },
      { start: 5, end: 7, transcript: 'Second' },
      { start: 10, end: 12, transcript: 'Third' },
    ];

    const result = findClosestSegment(4, segments);
    expect(result?.transcript).toBe('Second');
  });

  it('finds the closest segment by end time', () => {
    const segments: TranscriptionSegment[] = [
      { start: 0, end: 2, transcript: 'First' },
      { start: 10, end: 12, transcript: 'Second' },
    ];

    const result = findClosestSegment(3, segments);
    expect(result?.transcript).toBe('First'); // end=2 is closer to 3 than start=10
  });

  it('returns first segment when timestamp is before all', () => {
    const segments: TranscriptionSegment[] = [
      { start: 5, end: 7, transcript: 'First' },
      { start: 10, end: 12, transcript: 'Second' },
    ];

    const result = findClosestSegment(0, segments);
    expect(result?.transcript).toBe('First');
  });
});
