import { useCallback, useState } from 'react';
import { useGetEventsQuery, useCreateEventMutation, useUpdateEventMutation, useDeleteEventMutation } from '@/generated/graphql';
import { Event } from 'react-big-calendar';

export interface CalendarEvent extends Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  category?: string;
  description?: string;
  location?: string;
}

export const useCalendar = (startDate: Date, endDate: Date) => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  const { data, loading, error, refetch } = useGetEventsQuery({
    variables: {
      filter: {
        startDate: startDate.toISOString().split('T')[0], // Extract date part only
        endDate: endDate.toISOString().split('T')[0],
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  const [createEvent] = useCreateEventMutation({
    refetchQueries: ['GetEvents'],
  });

  const [updateEvent] = useUpdateEventMutation({
    refetchQueries: ['GetEvents'],
  });

  const [deleteEvent] = useDeleteEventMutation({
    refetchQueries: ['GetEvents'],
  });

  const events: CalendarEvent[] = data?.events.map(event => ({
    id: event.id,
    title: event.title,
    start: new Date(event.startTime),
    end: new Date(event.endTime),
    description: event.description || undefined,
    location: event.location ? `${event.location.name}${event.location.address ? ', ' + event.location.address : ''}` : undefined,
  })) || [];

  const handleCreateEvent = useCallback(async (newEvent: Omit<CalendarEvent, 'id'>) => {
    try {
      await createEvent({
        variables: {
          input: {
            title: newEvent.title,
            startTime: newEvent.start.toISOString(),
            endTime: newEvent.end.toISOString(),
            description: newEvent.description,
            location: newEvent.location ? {
              name: newEvent.location,
              address: null,
            } : undefined,
          },
        },
      });
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  }, [createEvent]);

  const handleUpdateEvent = useCallback(async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      await updateEvent({
        variables: {
          id: eventId,
          input: {
            title: updates.title,
            startTime: updates.start?.toISOString(),
            endTime: updates.end?.toISOString(),
            description: updates.description,
            location: updates.location ? {
              name: updates.location,
              address: null,
            } : undefined,
          },
        },
      });
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    }
  }, [updateEvent]);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    try {
      await deleteEvent({
        variables: { id: eventId },
      });
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw error;
    }
  }, [deleteEvent]);

  return {
    events,
    loading,
    error,
    selectedEvent,
    setSelectedEvent,
    createEvent: handleCreateEvent,
    updateEvent: handleUpdateEvent,
    deleteEvent: handleDeleteEvent,
    refetch,
  };
};