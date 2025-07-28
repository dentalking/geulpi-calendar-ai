import { AlertCircleIcon, RefreshCwIcon, WifiOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading this content.',
  onRetry,
  showRetry = true,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
          <AlertCircleIcon className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        {showRetry && onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCwIcon className="w-4 h-4" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}

export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Connection Problem"
      message="Please check your internet connection and try again."
      onRetry={onRetry}
    />
  );
}

export function NotFoundState({
  title = 'Not Found',
  message = 'The content you are looking for could not be found.',
  onGoBack,
}: {
  title?: string;
  message?: string;
  onGoBack?: () => void;
}) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gray-100 rounded-full mb-4">
          <span className="text-2xl font-bold text-gray-600">404</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        {onGoBack && (
          <Button onClick={onGoBack} variant="outline">
            Go Back
          </Button>
        )}
      </div>
    </div>
  );
}

export function OfflineState() {
  return (
    <Card className="m-4 border-orange-200 bg-orange-50">
      <CardContent className="flex items-center gap-3 p-4">
        <WifiOffIcon className="w-5 h-5 text-orange-600" />
        <div>
          <p className="font-medium text-orange-900">You are offline</p>
          <p className="text-sm text-orange-700">
            Some features may be limited until you reconnect.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  title = 'No data found',
  message = 'There is no content to display at the moment.',
  action,
  icon: Icon = AlertCircleIcon,
}: {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gray-100 rounded-full mb-4">
          <Icon className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        {action && (
          <Button onClick={action.onClick} className="gap-2">
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}