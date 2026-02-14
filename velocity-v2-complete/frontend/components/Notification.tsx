
import React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { CheckCircleIcon, XCircleIcon } from './icons';

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-4">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`flex items-center p-4 rounded-lg shadow-lg text-white ${
            notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {notification.type === 'success' ? <CheckCircleIcon /> : <XCircleIcon />}
          <span className="ml-3">{notification.message}</span>
          <button onClick={() => removeNotification(notification.id)} className="ml-4 p-1 rounded-full hover:bg-black/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;
