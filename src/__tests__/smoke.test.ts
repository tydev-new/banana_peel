import { describe, expect, it } from 'vitest';
import App from '../App';

describe('App', () => {
  it('is a function component', () => {
    expect(typeof App).toBe('function');
  });
});
