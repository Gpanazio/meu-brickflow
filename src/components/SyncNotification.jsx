import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, WifiOff, Save } from 'lucide-react';

export function SyncNotification({ type, message, duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const configs = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-emerald-900/90',
      borderColor: 'border-emerald-600',
      iconColor: 'text-emerald-400'
    },
    error: {
      icon: WifiOff,
      bgColor: 'bg-red-900/90',
      borderColor: 'border-red-600',
      iconColor: 'text-red-400'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-orange-900/90',
      borderColor: 'border-orange-600',
      iconColor: 'text-orange-400'
    },
    info: {
      icon: Save,
      bgColor: 'bg-zinc-900/90',
      borderColor: 'border-zinc-600',
      iconColor: 'text-zinc-400'
    }
  };

  const config = configs[type] || configs.info;
  const Icon = config.icon;

  return (
    <div
      className={`fixed bottom-8 right-8 z-[100] transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div
        className={`${config.bgColor} ${config.borderColor} border backdrop-blur-sm rounded-none px-6 py-4 flex items-center gap-4 shadow-2xl min-w-[320px] max-w-md`}
      >
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0`} />
        <p className="brick-tech text-[10px] text-white uppercase tracking-widest flex-1">
          {message}
        </p>
      </div>
    </div>
  );
}

export function SyncNotificationContainer({ notifications, removeNotification }) {
  return (
    <>
      {notifications.map((notif) => (
        <SyncNotification
          key={notif.id}
          type={notif.type}
          message={notif.message}
          duration={notif.duration}
          onClose={() => removeNotification(notif.id)}
        />
      ))}
    </>
  );
}
