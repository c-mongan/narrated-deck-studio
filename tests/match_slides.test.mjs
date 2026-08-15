import test from 'node:test';
import assert from 'node:assert/strict';

import { matchTranscriptToSlides } from '../scripts/match_slides.mjs';

test('maps timestamped narration segments to the strongest slide in order', () => {
  const slides = [
    { slide: 1, text: 'Revenue grew 25 percent. Customer retention improved.' },
    { slide: 2, text: 'Next steps: launch the regional pilot and collect feedback.' },
  ];
  const segments = [
    { start: 1.2, end: 4.8, text: 'Revenue grew by 25 percent and retention improved.' },
    { start: 5.1, end: 9.3, text: 'Our next steps are to launch the regional pilot.' },
  ];

  const result = matchTranscriptToSlides(slides, segments);
  assert.deepEqual(result.mappings.map((item) => item.slide), [1, 2]);
  assert.equal(result.mappings[0].start, 1.2);
  assert.ok(result.mappings.every((item) => item.score > 0.3));
});

test('rejects an empty slide list', () => {
  assert.throws(
    () => matchTranscriptToSlides([], [{ start: 0, end: 1, text: 'Hello' }]),
    /at least one slide/i,
  );
});

test('flags weak narration-to-slide matches for human review', () => {
  const result = matchTranscriptToSlides(
    [{ slide: 1, text: 'Budget and delivery schedule' }],
    [{ start: 0, end: 2, text: 'The weather is sunny today' }],
    { minimumScore: 0.2 },
  );
  assert.equal(result.mappings[0].reviewRequired, true);
  assert.equal(result.summary.reviewRequired, 1);
});
