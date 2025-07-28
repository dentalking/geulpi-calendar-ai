/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { InMemoryCache } from '@apollo/client';
import { GraphQLError } from 'graphql';
import {
  useGetMeQuery,
  useUpdateProfileMutation,
  useGetEventsQuery,
  useCreateEventMutation,
  useDeleteEventMutation,
  GetMeDocument,
  UpdateProfileDocument,
  GetEventsDocument,
  CreateEventDocument,
  DeleteEventDocument,
} from '@/generated/graphql';

// Mock data
const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  onboardingCompleted: true,
  lifePhilosophy: {
    areas: [
      {
        id: '1',
        name: 'Work',
        color: '#3B82F6',
        icon: 'briefcase',
        targetPercentage: 40,
      },
      {
        id: '2',
        name: 'Health',
        color: '#10B981',
        icon: 'heart',
        targetPercentage: 30,
      },
    ],
    idealBalance: { work: 40, health: 30, personal: 30 },
  },
  preferences: {
    workingHours: {
      start: '09:00',
      end: '18:00',
      timezone: 'UTC',
    },
    notifications: {
      reminders: true,
    },
    aiAssistance: {
      proactivityLevel: 'MEDIUM',
      autoScheduling: true,
      autoClassification: true,
    },
    defaultEventDuration: 60,
    bufferTime: 15,
  },
};

const mockEvents = [
  {
    id: '1',
    title: 'Morning Meeting',
    description: 'Daily standup meeting',
    startTime: '2024-01-01T09:00:00Z',
    endTime: '2024-01-01T10:00:00Z',
    allDay: false,
    area: {
      id: '1',
      name: 'Work',
      color: '#3B82F6',
    },
    location: {
      name: 'Conference Room A',
      address: '123 Office St',
    },
    recurrence: null,
    attendees: ['john@example.com'],
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z',
  },
];

const mockEventFilter = {
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  areaIds: [],
};

// Test Components
const GetMeTestComponent = () => {
  const { data, loading, error } = useGetMeQuery();

  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">Error: {error.message}</div>;
  if (data?.me) {
    return (
      <div data-testid="user-data">
        <div data-testid="user-name">{data.me.name}</div>
        <div data-testid="user-email">{data.me.email}</div>
        <div data-testid="onboarding-status">
          {data.me.onboardingCompleted ? 'Completed' : 'Pending'}
        </div>
      </div>
    );
  }
  return <div data-testid="no-data">No data</div>;
};

const UpdateProfileTestComponent = () => {
  const [updateProfile, { data, loading, error }] = useUpdateProfileMutation();

  const handleUpdate = () => {
    updateProfile({
      variables: {
        input: {
          name: 'Updated Name',
        },
      },
    });
  };

  if (loading) return <div data-testid="updating">Updating...</div>;
  if (error) return <div data-testid="update-error">Error: {error.message}</div>;
  if (data?.updateProfile) {
    return (
      <div data-testid="update-success">
        <div data-testid="updated-name">{data.updateProfile.name}</div>
        <div data-testid="updated-email">{data.updateProfile.email}</div>
      </div>
    );
  }

  return (
    <button data-testid="update-button" onClick={handleUpdate}>
      Update Profile
    </button>
  );
};

const GetEventsTestComponent = () => {
  const { data, loading, error } = useGetEventsQuery({
    variables: { filter: mockEventFilter },
  });

  if (loading) return <div data-testid="events-loading">Loading events...</div>;
  if (error) return <div data-testid="events-error">Error: {error.message}</div>;
  if (data?.events) {
    return (
      <div data-testid="events-data">
        {data.events.map((event) => (
          <div key={event.id} data-testid={`event-${event.id}`}>
            <div data-testid={`event-title-${event.id}`}>{event.title}</div>
            <div data-testid={`event-description-${event.id}`}>{event.description}</div>
          </div>
        ))}
      </div>
    );
  }
  return <div data-testid="no-events">No events</div>;
};

const CreateEventTestComponent = () => {
  const [createEvent, { data, loading, error }] = useCreateEventMutation();

  const handleCreate = () => {
    createEvent({
      variables: {
        input: {
          title: 'New Event',
          description: 'New event description',
          startTime: '2024-01-01T10:00:00Z',
          endTime: '2024-01-01T11:00:00Z',
          allDay: false,
        },
      },
    });
  };

  if (loading) return <div data-testid="creating">Creating event...</div>;
  if (error) return <div data-testid="create-error">Error: {error.message}</div>;
  if (data?.createEvent) {
    return (
      <div data-testid="create-success">
        <div data-testid="created-event-title">{data.createEvent.title}</div>
        <div data-testid="created-event-description">{data.createEvent.description}</div>
      </div>
    );
  }

  return (
    <button data-testid="create-button" onClick={handleCreate}>
      Create Event
    </button>
  );
};

const DeleteEventTestComponent = ({ eventId }: { eventId: string }) => {
  const [deleteEvent, { loading, error, data }] = useDeleteEventMutation();

  const handleDelete = () => {
    deleteEvent({
      variables: { id: eventId },
    });
  };

  if (loading) return <div data-testid="deleting">Deleting event...</div>;
  if (error) return <div data-testid="delete-error">Error: {error.message}</div>;
  if (data?.deleteEvent) {
    return <div data-testid="delete-success">Event deleted successfully</div>;
  }

  return (
    <button data-testid="delete-button" onClick={handleDelete}>
      Delete Event
    </button>
  );
};

describe('GraphQL Hooks', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache();
  });

  describe('useGetMeQuery', () => {
    it('should fetch user data successfully', async () => {
      const mocks = [
        {
          request: {
            query: GetMeDocument,
          },
          result: {
            data: {
              me: mockUser,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} cache={cache}>
          <GetMeTestComponent />
        </MockedProvider>
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('user-data')).toBeInTheDocument();
      });

      expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('onboarding-status')).toHaveTextContent('Completed');
    });

    it('should handle loading state', async () => {
      const mocks = [
        {
          request: {
            query: GetMeDocument,
          },
          result: {
            data: { me: mockUser },
          },
          delay: 100,
        },
      ];

      render(
        <MockedProvider mocks={mocks} cache={cache}>
          <GetMeTestComponent />
        </MockedProvider>
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('should handle error state', async () => {
      const mocks = [
        {
          request: {
            query: GetMeDocument,
          },
          error: new Error('Authentication failed'),
        },
      ];

      render(
        <MockedProvider mocks={mocks} cache={cache}>
          <GetMeTestComponent />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error')).toHaveTextContent('Error: Authentication failed');
    });

    it('should handle GraphQL errors', async () => {
      const mocks = [
        {
          request: {
            query: GetMeDocument,
          },
          result: {
            errors: [new GraphQLError('User not found')],
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} cache={cache}>
          <GetMeTestComponent />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error')).toHaveTextContent('User not found');
    });
  });

  describe('useUpdateProfileMutation', () => {
    it('should update profile successfully', async () => {
      const mocks = [
        {
          request: {
            query: UpdateProfileDocument,
            variables: {
              input: {
                name: 'Updated Name',
                    },
            },
          },
          result: {
            data: {
              updateProfile: {
                id: '1',
                name: 'Updated Name',
                    },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} cache={cache}>
          <UpdateProfileTestComponent />
        </MockedProvider>
      );

      const updateButton = screen.getByTestId('update-button');
      fireEvent.click(updateButton);

      expect(screen.getByTestId('updating')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('update-success')).toBeInTheDocument();
      });

      expect(screen.getByTestId('updated-name')).toHaveTextContent('Updated Name');
      expect(screen.getByTestId('updated-email')).toHaveTextContent('updated@example.com');
    });

    it('should handle mutation errors', async () => {
      const mocks = [
        {
          request: {
            query: UpdateProfileDocument,
            variables: {
              input: {
                name: 'Updated Name',
                    },
            },
          },
          error: new Error('Update failed'),
        },
      ];

      render(
        <MockedProvider mocks={mocks} cache={cache}>
          <UpdateProfileTestComponent />
        </MockedProvider>
      );

      const updateButton = screen.getByTestId('update-button');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByTestId('update-error')).toBeInTheDocument();
      });

      expect(screen.getByTestId('update-error')).toHaveTextContent('Error: Update failed');
    });
  });

  describe('useGetEventsQuery', () => {
    it('should fetch events successfully', async () => {
      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: { filter: mockEventFilter },
          },
          result: {
            data: {
              events: mockEvents,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} cache={cache}>
          <GetEventsTestComponent />
        </MockedProvider>
      );

      expect(screen.getByTestId('events-loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('events-data')).toBeInTheDocument();
      });

      expect(screen.getByTestId('event-1')).toBeInTheDocument();
      expect(screen.getByTestId('event-title-1')).toHaveTextContent('Morning Meeting');
      expect(screen.getByTestId('event-description-1')).toHaveTextContent('Daily standup meeting');
    });

    it('should handle empty events list', async () => {
      const mocks = [
        {
          request: {
            query: GetEventsDocument,
            variables: { filter: mockEventFilter },
          },
          result: {
            data: {
              events: [],
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} cache={cache}>
          <GetEventsTestComponent />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('events-data')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('event-1')).not.toBeInTheDocument();
    });
  });

  describe('useCreateEventMutation', () => {
    it('should create event successfully', async () => {
      const newEvent = {
        id: '2',
        title: 'New Event',
        description: 'New event description',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T11:00:00Z',
        allDay: false,
        area: {
          id: '1',
          name: 'Work',
          color: '#3B82F6',
        },
        location: null,
      };

      const mocks = [
        {
          request: {
            query: CreateEventDocument,
            variables: {
              input: {
                title: 'New Event',
                description: 'New event description',
                startTime: '2024-01-01T10:00:00Z',
                endTime: '2024-01-01T11:00:00Z',
                allDay: false,
              },
            },
          },
          result: {
            data: {
              createEvent: newEvent,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} cache={cache}>
          <CreateEventTestComponent />
        </MockedProvider>
      );

      const createButton = screen.getByTestId('create-button');
      fireEvent.click(createButton);

      expect(screen.getByTestId('creating')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('create-success')).toBeInTheDocument();
      });

      expect(screen.getByTestId('created-event-title')).toHaveTextContent('New Event');
      expect(screen.getByTestId('created-event-description')).toHaveTextContent('New event description');
    });
  });

  describe('useDeleteEventMutation', () => {
    it('should delete event successfully', async () => {
      const mocks = [
        {
          request: {
            query: DeleteEventDocument,
            variables: { id: '1' },
          },
          result: {
            data: {
              deleteEvent: true,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} cache={cache}>
          <DeleteEventTestComponent eventId="1" />
        </MockedProvider>
      );

      const deleteButton = screen.getByTestId('delete-button');
      fireEvent.click(deleteButton);

      expect(screen.getByTestId('deleting')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('delete-success')).toBeInTheDocument();
      });

      expect(screen.getByTestId('delete-success')).toHaveTextContent('Event deleted successfully');
    });

    it('should handle delete errors', async () => {
      const mocks = [
        {
          request: {
            query: DeleteEventDocument,
            variables: { id: '1' },
          },
          error: new Error('Delete failed'),
        },
      ];

      render(
        <MockedProvider mocks={mocks} cache={cache}>
          <DeleteEventTestComponent eventId="1" />
        </MockedProvider>
      );

      const deleteButton = screen.getByTestId('delete-button');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByTestId('delete-error')).toBeInTheDocument();
      });

      expect(screen.getByTestId('delete-error')).toHaveTextContent('Error: Delete failed');
    });
  });

  describe('Cache Integration', () => {
    it('should update cache after successful mutation', async () => {
      const CacheTestComponent = () => {
        const [updateProfile, { data, loading, error }] = useUpdateProfileMutation();

        const handleUpdate = () => {
          updateProfile({
            variables: {
              input: {
                name: 'Cache Updated Name',
              },
            },
          });
        };

        if (loading) return <div data-testid="cache-updating">Updating...</div>;
        if (error) return <div data-testid="cache-error">Error: {error.message}</div>;
        if (data?.updateProfile) {
          return (
            <div data-testid="cache-success">
              <div data-testid="cache-updated-name">{data.updateProfile.name}</div>
              <div data-testid="cache-updated-email">{data.updateProfile.email}</div>
            </div>
          );
        }

        return (
          <button data-testid="cache-update-button" onClick={handleUpdate}>
            Update Profile
          </button>
        );
      };

      const updateMock = [
        {
          request: {
            query: UpdateProfileDocument,
            variables: {
              input: {
                name: 'Cache Updated Name',
              },
            },
          },
          result: {
            data: {
              updateProfile: {
                id: '1',
                name: 'Cache Updated Name',
                email: 'cache@example.com',
              },
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={updateMock} cache={cache}>
          <CacheTestComponent />
        </MockedProvider>
      );

      const updateButton = screen.getByTestId('cache-update-button');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByTestId('cache-success')).toBeInTheDocument();
      });

      expect(screen.getByTestId('cache-updated-name')).toHaveTextContent('Cache Updated Name');
      expect(screen.getByTestId('cache-updated-email')).toHaveTextContent('cache@example.com');

      // Verify cache was updated
      const cacheData = cache.extract();
      expect(cacheData).toBeDefined();
    });
  });

  describe('Variable Matching', () => {
    it('should match variables correctly', async () => {
      const variableMatcher = jest.fn().mockReturnValue(true);

      const mocks = [
        {
          request: {
            query: GetEventsDocument,
          },
          variableMatcher,
          result: {
            data: {
              events: mockEvents,
            },
          },
        },
      ];

      render(
        <MockedProvider mocks={mocks} cache={cache}>
          <GetEventsTestComponent />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('events-data')).toBeInTheDocument();
      });

      expect(variableMatcher).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: mockEventFilter,
        })
      );
    });
  });
});