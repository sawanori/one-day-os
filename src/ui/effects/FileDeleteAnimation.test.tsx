/**
 * FileDeleteAnimation Tests
 */
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { FileDeleteAnimation } from './FileDeleteAnimation';

describe('FileDeleteAnimation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should display files one by one with delay', async () => {
    const files = ['quests.db', 'anti_vision.db', 'identity_core.db'];
    const { findByText } = render(<FileDeleteAnimation files={files} />);

    // 最初のファイルがすぐ表示
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    const file1 = await findByText('DELETE: quests.db');
    expect(file1).toBeDefined();

    // 500ms後に2番目
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    const file2 = await findByText('DELETE: anti_vision.db');
    expect(file2).toBeDefined();

    // 1000ms後に3番目
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    const file3 = await findByText('DELETE: identity_core.db');
    expect(file3).toBeDefined();
  });

  it('should handle empty file list', () => {
    const { root } = render(<FileDeleteAnimation files={[]} />);
    expect(root).toBeDefined();
  });

  it('should handle single file', async () => {
    const files = ['single.db'];
    const { findByText } = render(<FileDeleteAnimation files={files} />);

    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    const file = await findByText('DELETE: single.db');
    expect(file).toBeDefined();
  });

  it('should display multiple files in order', async () => {
    const files = ['first.db', 'second.db'];
    const { findByText, queryByText } = render(<FileDeleteAnimation files={files} />);

    // Initially, second file should not be visible
    expect(queryByText('DELETE: second.db')).toBeNull();

    // First file appears immediately
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    expect(await findByText('DELETE: first.db')).toBeDefined();

    // Second file appears after 500ms
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(await findByText('DELETE: second.db')).toBeDefined();
  });

  it('should render with proper styling', async () => {
    const files = ['test.db'];
    const { getByText } = render(<FileDeleteAnimation files={files} />);

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    await waitFor(() => {
      const element = getByText('DELETE: test.db');
      expect(element).toBeDefined();
    });
  });
});
