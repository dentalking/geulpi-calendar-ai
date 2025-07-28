import React from 'react';
import { format } from 'date-fns';
import { CalendarIcon, ClockIcon, MapPinIcon, CheckIcon, XIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PreviewEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
  area?: {
    id: string;
    name: string;
    color: string;
  };
}

interface EventPreviewProps {
  events: PreviewEvent[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function EventPreview({ events, onConfirm, onCancel, isLoading = false }: EventPreviewProps) {
  if (events.length === 0) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          {events.length === 1 ? 'Extracted Event' : `Extracted Events (${events.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.map((event, index) => (
          <div
            key={event.id || index}
            className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-2">{event.title}</h4>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4" />
                    <span>
                      {format(new Date(event.startTime), 'MMM d, yyyy h:mm a')} - {' '}
                      {format(new Date(event.endTime), 'h:mm a')}
                    </span>
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  
                  {event.area && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: event.area.color }}
                      />
                      <span>{event.area.name}</span>
                    </div>
                  )}
                </div>
                
                {event.description && (
                  <p className="text-sm text-gray-600 mt-2 p-2 bg-white rounded border">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        
        <div className="flex gap-2 pt-2">
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Adding Events...
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4 mr-2" />
                Add {events.length === 1 ? 'Event' : 'All Events'} to Calendar
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            <XIcon className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}