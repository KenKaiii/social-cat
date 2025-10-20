'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Play, Loader2, Settings2, Check, X, Filter } from 'lucide-react';
import { SchedulePicker } from './SchedulePicker';
import { Input } from '@/components/ui/input';

interface CompactAutomationRowProps {
  title: string;
  jobName: string;
  defaultInterval?: string;
  defaultPrompt?: string;
}

export function CompactAutomationRow({
  title,
  jobName,
  defaultInterval = '*/30 * * * *',
  defaultPrompt = '',
}: CompactAutomationRowProps) {
  const [interval, setInterval] = useState(defaultInterval);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [enabled, setEnabled] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Search filter states (for reply-to-tweets job)
  const [minimumLikes, setMinimumLikes] = useState(5);
  const [minimumRetweets, setMinimumRetweets] = useState(2);
  const [searchFromToday, setSearchFromToday] = useState(true);
  const [removeLinks, setRemoveLinks] = useState(true);
  const [removeMedia, setRemoveMedia] = useState(true);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/jobs/trigger?job=${jobName}`, { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.error || 'Unknown error' });
      }
    } catch (error) {
      setTestResult({ success: false, message: `Failed: ${error}` });
    } finally {
      setTesting(false);
    }
  };

  const getScheduleLabel = (cron: string) => {
    const presets: Record<string, string> = {
      '*/5 * * * *': 'Every 5 min',
      '*/15 * * * *': 'Every 15 min',
      '*/30 * * * *': 'Every 30 min',
      '0 * * * *': 'Hourly',
      '0 */4 * * *': 'Every 4 hours',
      '0 9 * * *': 'Daily 9 AM',
      '0 18 * * *': 'Daily 6 PM',
      '0 9 * * 1': 'Mon 9 AM',
    };
    return presets[cron] || cron;
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 border border-border rounded-md bg-surface hover:bg-surface-hover transition-colors">
      {/* Title & Status */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Switch checked={enabled} onCheckedChange={setEnabled} />
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm truncate">{title}</div>
          <div className="text-[10px] text-secondary">{getScheduleLabel(interval)}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Schedule Button */}
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <Settings2 className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-surface border-border">
            <DialogHeader>
              <DialogTitle className="text-base font-black">Schedule</DialogTitle>
              <DialogDescription className="text-xs text-secondary">
                Choose when this automation runs
              </DialogDescription>
            </DialogHeader>
            <SchedulePicker value={interval} onChange={setInterval} />
          </DialogContent>
        </Dialog>

        {/* Prompt Button */}
        <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl bg-surface border-border">
            <DialogHeader>
              <DialogTitle className="text-base font-black">System Prompt</DialogTitle>
              <DialogDescription className="text-xs text-secondary">
                Configure how the AI behaves for this automation
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your system prompt..."
              className="min-h-[200px] bg-background border-border text-sm resize-none"
            />
            <Button onClick={() => setPromptOpen(false)} className="h-8 text-xs">
              Save
            </Button>
          </DialogContent>
        </Dialog>

        {/* Filters Button (only for reply-to-tweets) */}
        {jobName === 'twitter-reply-tweets' && (
          <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <Filter className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-surface border-border">
              <DialogHeader>
                <DialogTitle className="text-base font-black">Search Filters</DialogTitle>
                <DialogDescription className="text-xs text-secondary">
                  Configure tweet search criteria for better targeting
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Min Likes
                    </label>
                    <Input
                      type="number"
                      value={minimumLikes}
                      onChange={(e) => setMinimumLikes(Number(e.target.value))}
                      min={0}
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Min Retweets
                    </label>
                    <Input
                      type="number"
                      value={minimumRetweets}
                      onChange={(e) => setMinimumRetweets(Number(e.target.value))}
                      min={0}
                      className="h-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={searchFromToday}
                      onChange={(e) => setSearchFromToday(e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-input accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
                    />
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                      Only tweets from today
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={removeLinks}
                      onChange={(e) => setRemoveLinks(e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-input accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
                    />
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                      Remove tweets with links
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={removeMedia}
                      onChange={(e) => setRemoveMedia(e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-input accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
                    />
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                      Remove tweets with images/videos
                    </span>
                  </label>
                </div>
              </div>

              <Button onClick={() => setFiltersOpen(false)} className="h-8 text-xs">
                Save Filters
              </Button>
            </DialogContent>
          </Dialog>
        )}

        {/* Test Button */}
        <Button
          onClick={handleTest}
          disabled={testing}
          variant="outline"
          size="sm"
          className="h-7 px-3 text-xs"
        >
          {testing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Test Result Overlay */}
      {testResult && (
        <div className="absolute right-3 top-3">
          {testResult.success ? (
            <Check className="h-4 w-4 text-accent" />
          ) : (
            <X className="h-4 w-4 text-destructive" />
          )}
        </div>
      )}
    </div>
  );
}
