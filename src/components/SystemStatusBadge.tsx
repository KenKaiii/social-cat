'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { logger } from '@/lib/logger';

type SystemStatus = 'cold' | 'warming' | 'warm' | 'hot';

interface SystemStatusInfo {
  status: SystemStatus;
  modulesLoaded: number;
  totalModules: number;
  credentialsCached: number;
}

// Cache status in memory (survives route changes)
let statusCache: SystemStatusInfo | null = null;

const STATUS_CONFIG = {
  cold: {
    label: 'Cold',
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    description: 'System starting up - First workflow may take 1-3s longer',
  },
  warming: {
    label: 'Warming',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    description: 'Loading workflow modules - Performance improving',
  },
  warm: {
    label: 'Warm',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    description: 'All modules loaded - Workflows ready to execute',
  },
  hot: {
    label: 'Hot',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    description: 'Fully optimized - Modules + credentials cached',
  },
};

export function SystemStatusBadge() {
  const [statusInfo, setStatusInfo] = useState<SystemStatusInfo>(() => {
    // Initialize with cached data if available
    return statusCache || {
      status: 'cold',
      modulesLoaded: 0,
      totalModules: 0,
      credentialsCached: 0,
    };
  });

  useEffect(() => {
    // Fetch initial status
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/system/status');
        if (response.ok) {
          const data = await response.json();
          setStatusInfo(data);
          statusCache = data; // Update cache
        }
      } catch (error) {
        logger.error({ error }, 'Failed to fetch system status');
      }
    };

    fetchStatus();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const config = STATUS_CONFIG[statusInfo.status];
  const loadPercentage = statusInfo.totalModules > 0
    ? Math.round((statusInfo.modulesLoaded / statusInfo.totalModules) * 100)
    : 0;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5">
        {/* Status Badge */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-alpha-400">
          <div className={`w-1.5 h-1.5 rounded-full ${config.color} animate-pulse`} />
          <span className={`text-[10px] font-medium ${config.textColor} uppercase tracking-wide`}>
            {config.label}
          </span>
        </div>

        {/* Info Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="text-gray-500 hover:text-gray-700 transition-colors">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[250px]">
            <div className="space-y-2">
              <p className="text-xs font-medium">{config.description}</p>
              {statusInfo.totalModules > 0 && (
                <div className="text-[10px] text-gray-600 space-y-0.5">
                  <div>Modules: {statusInfo.modulesLoaded}/{statusInfo.totalModules} ({loadPercentage}%)</div>
                  {statusInfo.credentialsCached > 0 && (
                    <div>Credentials: {statusInfo.credentialsCached} users cached</div>
                  )}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
