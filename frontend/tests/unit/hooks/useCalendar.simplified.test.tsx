/**
 * @jest-environment jsdom
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { InMemoryCache } from '@apollo/client';
import { GraphQLError } from 'graphql';
import { useCalendar, CalendarEvent } from '@/hooks/useCalendar';
import {
  GetEventsDocument,
  CreateEventDocument,
  UpdateEventDocument,
  DeleteEventDocument,
} from '@/generated/graphql';

// Simplified mock data
const mockLifeArea = {
  __typename: 'LifeArea',
  id: '1',
  name: 'Work',
  color: '#3B82F6',
};

const mockLocation = {
  __typename: 'Location',
  name: 'Conference Room A',
  address: '123 Office St',
};

const mockGraphQLEvents = [
  {
    __typename: 'Event',
    id: '1',
    title: 'Morning Standup',
    description: 'Daily team standup meeting',
    startTime: '2024-01-15T09:00:00Z',
    endTime: '2024-01-15T10:00:00Z',
    allDay: false,
    area: mockLifeArea,
    location: mockLocation,
    recurrence: null,
    attendees: ['john@example.com'],
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z',
  },
  {
    __typename: 'Event',
    id: '2',
    title: 'Lunch Break',
    description: 'Time for lunch',
    startTime: '2024-01-15T12:00:00Z',
    endTime: '2024-01-15T13:00:00Z',
    allDay: false,
    area: {
      __typename: 'LifeArea',
      id: '2',
      name: 'Personal',
      color: '#10B981',
    },
    location: null,
    recurrence: null,
    attendees: [],
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z',
  },
];

const mockEventFilter = {
  startDate: '2024-01-01',
  endDate: '2024-01-31',
};

// Expected calendar events after transformation
const expectedCalendarEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Morning Standup',
    start: new Date('2024-01-15T09:00:00Z'),
    end: new Date('2024-01-15T10:00:00Z'),
    description: 'Daily team standup meeting',
    location: 'Conference Room A, 123 Office St',
  },
  {
    id: '2',
    title: 'Lunch Break',
    start: new Date('2024-01-15T12:00:00Z'),
    end: new Date('2024-01-15T13:00:00Z'),
    description: 'Time for lunch',
    location: undefined,
  },
];

describe('useCalendar - Simplified Tests', () => {
  const mockStartDate = new Date('2024-01-01');
  const mockEndDate = new Date('2024-01-31');
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache({
      // Completely disable normalization for testing
      typePolicies: {
        Query: {
          fields: {
            events: {
              merge: false, // Don't try to merge arrays
            },
          },
        },
      },
    });
  });

  const createWrapper = (mocks: any[] = []) => {
    return ({ children }: { children: React.ReactNode }) => (
      <MockedProvider mocks={mocks} cache={cache} addTypename={true}>
        {children}
      </MockedProvider>
    );
  };

  describe('Core Query Functionality', () => {
    it('should initialize with loading state', () => {
      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          result: {
            data: { events: mockGraphQLEvents },
          },
          delay: 100,
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      expect(result.current.events).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeUndefined();
      expect(result.current.selectedEvent).toBeNull();
    });

    it('should fetch and transform events successfully', async () => {
      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          result: {
            data: { events: mockGraphQLEvents },
          },
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual(expectedCalendarEvents);
      expect(result.current.error).toBeUndefined();
    });

    it('should handle empty events list', async () => {
      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          result: {
            data: { events: [] },
          },
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual([]);
      expect(result.current.error).toBeUndefined();
    });

    it('should handle network errors', async () => {
      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          error: new Error('Network error'),
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual([]);
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Network error');
    });

    it('should handle GraphQL errors', async () => {
      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          result: {
            errors: [new GraphQLError('Events not found')],
          },
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toEqual([]);
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Events not found');
    });
  });

  describe('Date Conversion Logic', () => {
    it('should convert dates to YYYY-MM-DD format for variables', async () => {
      const customStartDate = new Date('2024-03-15T10:30:00');
      const customEndDate = new Date('2024-03-20T15:45:00');

      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: {
                startDate: '2024-03-15',
                endDate: '2024-03-20',
              },
            },
          },
          result: {
            data: { events: [] },
          },
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(customStartDate, customEndDate),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock match confirms correct date format
      expect(result.current.events).toEqual([]);
    });

    it('should transform GraphQL DateTime to Date objects', async () => {
      const eventWithTimezone = {
        ...mockGraphQLEvents[0],
        startTime: '2024-01-15T14:30:00+01:00',
        endTime: '2024-01-15T15:30:00+01:00',
      };

      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          result: {
            data: { events: [eventWithTimezone] },
          },
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events[0].start).toBeInstanceOf(Date);
      expect(result.current.events[0].end).toBeInstanceOf(Date);
      expect(result.current.events[0].start.toISOString()).toBe('2024-01-15T13:30:00.000Z');
      expect(result.current.events[0].end.toISOString()).toBe('2024-01-15T14:30:00.000Z');
    });

    it('should handle location formatting correctly', async () => {
      const eventsWithDifferentLocations = [
        {
          ...mockGraphQLEvents[0],
          location: { __typename: 'Location', name: 'Room A', address: null },
        },
        {
          ...mockGraphQLEvents[1],
          location: { __typename: 'Location', name: 'Room B', address: '456 Main St' },
        },
        {
          ...mockGraphQLEvents[0],
          id: '3',
          title: 'Event without location',
          location: null,
        },
      ];

      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          result: {
            data: { events: eventsWithDifferentLocations },
          },
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events[0].location).toBe('Room A');
      expect(result.current.events[1].location).toBe('Room B, 456 Main St');
      expect(result.current.events[2].location).toBeUndefined();
    });
  });

  describe('Event Selection', () => {
    it('should handle event selection', async () => {
      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          result: {
            data: { events: mockGraphQLEvents },
          },
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const eventToSelect: CalendarEvent = {
        id: '1',
        title: 'Test Event',
        start: new Date('2024-01-15T10:00:00'),
        end: new Date('2024-01-15T11:00:00'),
        description: 'Test description',
      };

      act(() => {
        result.current.setSelectedEvent(eventToSelect);
      });

      expect(result.current.selectedEvent).toEqual(eventToSelect);
    });

    it('should clear event selection', async () => {
      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          result: {
            data: { events: mockGraphQLEvents },
          },
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      const eventToSelect: CalendarEvent = {
        id: '1',
        title: 'Test Event',
        start: new Date('2024-01-15T10:00:00'),
        end: new Date('2024-01-15T11:00:00'),
      };

      act(() => {
        result.current.setSelectedEvent(eventToSelect);
      });

      expect(result.current.selectedEvent).toEqual(eventToSelect);

      act(() => {
        result.current.setSelectedEvent(null);
      });

      expect(result.current.selectedEvent).toBeNull();
    });
  });

  describe('Mutation Operations (Simplified)', () => {
    it('should call create event mutation correctly', async () => {
      const newEventInput: Omit<CalendarEvent, 'id'> = {
        title: 'New Meeting',
        start: new Date('2024-01-16T14:00:00Z'),
        end: new Date('2024-01-16T15:00:00Z'),
        description: 'Important meeting',
        location: 'Meeting Room B',
      };

      // Simple mock that matches what the mutation actually returns
      const createdEvent = {
        __typename: 'Event',
        id: '3',
        title: 'New Meeting',
        description: 'Important meeting',
        startTime: '2024-01-16T14:00:00Z',
        endTime: '2024-01-16T15:00:00Z',
        allDay: false,
        area: mockLifeArea,
        location: {
          __typename: 'Location',
          name: 'Meeting Room B',
          address: null,
        },
      };

      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          result: {
            data: { events: mockGraphQLEvents },
          },
        },
        {
          request: {
            query: CreateEventDocument,
            variables: {
              input: {
                title: 'New Meeting',
                startTime: '2024-01-16T14:00:00.000Z',
                endTime: '2024-01-16T15:00:00.000Z',
                description: 'Important meeting',
                location: {
                  name: 'Meeting Room B',
                  address: null,
                },
              },
            },
          },
          result: {
            data: {
              createEvent: createdEvent,
            },
          },
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.createEvent(newEventInput);
      });

      // Verify the mutation was called without error
      expect(result.current.error).toBeUndefined();
    });

    it('should handle create event errors', async () => {
      const newEventInput: Omit<CalendarEvent, 'id'> = {
        title: 'Failed Event',
        start: new Date('2024-01-16T14:00:00Z'),
        end: new Date('2024-01-16T15:00:00Z'),
      };

      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          result: {
            data: { events: mockGraphQLEvents },
          },
        },
        {
          request: {
            query: CreateEventDocument,
            variables: {
              input: {
                title: 'Failed Event',
                startTime: '2024-01-16T14:00:00.000Z',
                endTime: '2024-01-16T15:00:00.000Z',
                description: undefined,
                location: undefined,
              },
            },
          },
          error: new Error('Validation failed'),
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.createEvent(newEventInput);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Validation failed');
        }
      });
    });

    it('should call update event mutation correctly', async () => {
      const eventUpdates: Partial<CalendarEvent> = {
        title: 'Updated Meeting',
        description: 'Updated description',
      };

      const updatedEvent = {
        __typename: 'Event',
        id: '1',
        title: 'Updated Meeting',
        description: 'Updated description',
        startTime: '2024-01-15T09:00:00Z',
        endTime: '2024-01-15T10:00:00Z',
        allDay: false,
        area: mockLifeArea,
        location: mockLocation,
      };

      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          result: {
            data: { events: mockGraphQLEvents },
          },
        },
        {
          request: {
            query: UpdateEventDocument,
            variables: {
              id: '1',
              input: {
                title: 'Updated Meeting',
                startTime: undefined,
                endTime: undefined,
                description: 'Updated description',
                location: undefined,
              },
            },
          },
          result: {
            data: {
              updateEvent: updatedEvent,
            },
          },
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateEvent('1', eventUpdates);
      });

      expect(result.current.error).toBeUndefined();
    });

    it('should call delete event mutation correctly', async () => {
      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          result: {
            data: { events: mockGraphQLEvents },
          },
        },
        {
          request: {
            query: DeleteEventDocument,
            variables: {
              id: '1',
            },
          },
          result: {
            data: {
              deleteEvent: true,
            },
          },
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteEvent('1');
      });

      expect(result.current.error).toBeUndefined();
    });
  });

  describe('Variable Matching', () => {
    it('should match query variables correctly', async () => {
      const variableMatcher = jest.fn().mockReturnValue(true);

      const mocks = [
        {
          request: {
            query: GetEventsDocument,
          },
          variableMatcher,
          result: {
            data: { events: mockGraphQLEvents },
          },
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(variableMatcher).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            startDate: '2024-01-01',
            endDate: '2024-01-31',
          }),
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle events with null/undefined descriptions', async () => {
      const eventsWithNullDescription = [
        {
          ...mockGraphQLEvents[0],
          description: null,
        },
        {
          ...mockGraphQLEvents[1], 
          description: undefined,
        },
      ];

      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          result: {
            data: { events: eventsWithNullDescription },
          },
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);  
      });

      expect(result.current.events[0].description).toBeUndefined();
      expect(result.current.events[1].description).toBeUndefined();
    });

    it('should handle malformed date strings gracefully', async () => {
      const eventsWithBadDates = [
        {
          ...mockGraphQLEvents[0],
          startTime: 'invalid-date',
          endTime: 'also-invalid',
        },
      ];

      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          result: {
            data: { events: eventsWithBadDates },
          },
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should create Invalid Date objects
      expect(result.current.events[0].start).toBeInstanceOf(Date);
      expect(result.current.events[0].end).toBeInstanceOf(Date);
      expect(isNaN(result.current.events[0].start.getTime())).toBe(true);
      expect(isNaN(result.current.events[0].end.getTime())).toBe(true);
    });
  });

  describe('Refetch Functionality', () => {
    it('should provide refetch function', async () => {
      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          result: {
            data: { events: mockGraphQLEvents },
          },
        },
        {
          request: {
            query: GetEventsDocument,
            variables: {
              filter: mockEventFilter,
            },
          },
          result: {
            data: { events: [] },
          },
        },
      ];

      const wrapper = createWrapper(mocks);
      const { result } = renderHook(
        () => useCalendar(mockStartDate, mockEndDate),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.events).toHaveLength(2);
      expect(typeof result.current.refetch).toBe('function');

      // Trigger refetch
      await act(async () => {
        await result.current.refetch();
      });

      // Should use the second mock which returns empty array
      await waitFor(() => {
        expect(result.current.events).toHaveLength(0);
      });
    });
  });
});