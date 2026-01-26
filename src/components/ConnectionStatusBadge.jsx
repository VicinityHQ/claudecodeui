import React from 'react';
import { WifiOff } from 'lucide-react';
import { useWebSocketContext } from '../contexts/WebSocketContext';

/**
 * ConnectionStatusBadge - Shows WebSocket reconnection status
 *
 * Only displays when disconnected from WebSocket server.
 * Shows pending message count when messages are queued.
 * Uses polite aria-live for non-critical status updates.
 */
function ConnectionStatusBadge() {
  const { isConnected, pendingCount } = useWebSocketContext();

  // Only show during problem states - don't clutter UI when connected
  if (isConnected) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Reconnecting to server${pendingCount > 0 ? `, ${pendingCount} messages queued` : ''}`}
      className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md text-yellow-700 dark:text-yellow-300 text-sm transition-all duration-300 motion-reduce:transition-none"
    >
      <WifiOff className="w-4 h-4 animate-pulse motion-reduce:animate-none" />
      <span>
        Reconnecting...
        {pendingCount > 0 && (
          <span className="ml-1 font-medium">
            ({pendingCount} queued)
          </span>
        )}
      </span>
    </div>
  );
}

export default ConnectionStatusBadge;
