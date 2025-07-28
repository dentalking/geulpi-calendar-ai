import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useCalendar } from '@/hooks/useCalendar';
import { MockedProvider } from '@apollo/client/testing';

describe('useCalendar', () => {
  const mockStartDate = new Date('2024-01-01');
  const mockEndDate = new Date('2024-01-31');

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MockedProvider mocks={[]} addTypename={false}>
      {children}
    </MockedProvider>
  );

  it('should initialize with empty events', () => {
    const { result } = renderHook(
      () => useCalendar(mockStartDate, mockEndDate),
      { wrapper }
    );

    expect(result.current.events).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('should handle event selection', () => {
    const { result } = renderHook(
      () => useCalendar(mockStartDate, mockEndDate),
      { wrapper }
    );

    const mockEvent = {
      id: '1',
      title: 'Test Event',
      start: new Date('2024-01-15T10:00:00'),
      end: new Date('2024-01-15T11:00:00'),
    };

    act(() => {
      result.current.setSelectedEvent(mockEvent);
    });

    expect(result.current.selectedEvent).toEqual(mockEvent);
  });
});