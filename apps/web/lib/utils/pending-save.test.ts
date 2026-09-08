import { expect, it } from 'vitest';
import { acknowledgeSaved } from './pending-save';
it('preserves typing and new steps that arrived during an in-flight save', () => {
  expect(acknowledgeSaved({a:'new text',b:'saved text',c:'new step'},{a:'old text',b:'saved text'})).toEqual({a:'new text',c:'new step'});
});
it('keeps a newly edited annotation array while acknowledging the saved one', () => {
  const before=[{x:0.1}], after=[{x:0.2}];
  expect(acknowledgeSaved({a:after,b:before},{a:before,b:before})).toEqual({a:after});
});
