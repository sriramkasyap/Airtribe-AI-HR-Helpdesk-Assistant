// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarkdownContent from './MarkdownContent';

describe('MarkdownContent', () => {
  it('renders headings, lists, and emphasis from markdown', () => {
    render(
      <MarkdownContent
        content={`## Leave balance\n\nYou have **3** casual leaves left.\n\n- Casual: 3\n- Sick: 5`}
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Leave balance' })).toBeTruthy();
    expect(screen.getByText('3').tagName).toBe('STRONG');
    expect(screen.getByText('Casual: 3').closest('li')).toBeTruthy();
  });

  it('renders GFM tables', () => {
    const { container } = render(
      <MarkdownContent content={`| Type | Days |\n| --- | --- |\n| Casual | 3 |`} />,
    );
    expect(container.querySelector('table')).toBeTruthy();
    expect(screen.getByText('Casual')).toBeTruthy();
  });
});
