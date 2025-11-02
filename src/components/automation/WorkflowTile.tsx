'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Play, Loader2, Settings2, Check, X, Filter, History, MessageSquare, MoreHorizontal } from 'lucide-react';
import { SchedulePicker } from './SchedulePicker';
import { Input } from '@/components/ui/input';
import { ReplyHistoryTable } from '@/components/twitter/ReplyHistoryTable';
import { PostedThreadsHistoryTable } from '@/components/twitter/PostedThreadsHistoryTable';
import { showTwitter403Error, showTwitter429Error, showApiError, showTwitterSuccess } from '@/lib/toast-helpers';
import { fireSuccessConfetti } from '@/lib/confetti';
import { NEWS_TOPICS, NEWS_LANGUAGES, NEWS_COUNTRIES } from '@/modules/external-apis/rapidapi/newsapi/constants';

interface WorkflowTileProps {
  title: string;
  description?: string;
  jobName: string;
  defaultInterval?: string;
  defaultPrompt?: string;
  defaultSearchQuery?: string;
}

export function WorkflowTile({
  title,
  description,
  jobName,
  defaultInterval = '*/30 * * * *',
  defaultPrompt = '',
  defaultSearchQuery = '',
}: WorkflowTileProps) {
  const [interval, setInterval] = useState(defaultInterval);
  const [systemPrompt, setSystemPrompt] = useState(defaultPrompt);
  const [enabled, setEnabled] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search filter states (for reply-to-tweets job)
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);
  const [minimumLikes, setMinimumLikes] = useState(50);
  const [minimumRetweets, setMinimumRetweets] = useState(10);
  const [searchFromToday, setSearchFromToday] = useState(true);
  const [removeLinks, setRemoveLinks] = useState(true);
  const [removeMedia, setRemoveMedia] = useState(true);

  // Thread settings (for post-tweets job)
  const [isThread, setIsThread] = useState(true);
  const [threadLength, setThreadLength] = useState(3);

  // News research settings (for post-tweets job)
  const [useNewsResearch, setUseNewsResearch] = useState(true);
  const [newsTopic, setNewsTopic] = useState('technology');
  const [newsLanguage, setNewsLanguage] = useState('en');
  const [newsCountry, setNewsCountry] = useState('US');

  // Prompt modifiers (style toggles)
  const [noHashtags, setNoHashtags] = useState(false);
  const [noEmojis, setNoEmojis] = useState(false);
  const [casualGrammar, setCasualGrammar] = useState(false);
  const [maxCharacters, setMaxCharacters] = useState('280');

  // Load settings from database on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`/api/legacy/automation/settings?job=${jobName}`);
        if (response.ok) {
          const settings = await response.json();

          // Apply loaded settings to state
          if (settings.interval !== undefined) setInterval(settings.interval);
          if (settings.systemPrompt !== undefined) setSystemPrompt(settings.systemPrompt);
          if (settings.prompt !== undefined) setSystemPrompt(settings.prompt);
          if (settings.enabled !== undefined) setEnabled(settings.enabled);
          if (settings.searchQuery !== undefined) setSearchQuery(settings.searchQuery);
          if (settings.minimumLikes !== undefined) setMinimumLikes(settings.minimumLikes);
          if (settings.minimumRetweets !== undefined) setMinimumRetweets(settings.minimumRetweets);
          if (settings.searchFromToday !== undefined) setSearchFromToday(settings.searchFromToday);
          if (settings.removeLinks !== undefined) setRemoveLinks(settings.removeLinks);
          if (settings.removeMedia !== undefined) setRemoveMedia(settings.removeMedia);
          if (settings.isThread !== undefined) setIsThread(settings.isThread);
          if (settings.threadLength !== undefined) setThreadLength(settings.threadLength);
          if (settings.useNewsResearch !== undefined) setUseNewsResearch(settings.useNewsResearch);
          if (settings.newsTopic !== undefined) setNewsTopic(settings.newsTopic);
          if (settings.newsLanguage !== undefined) setNewsLanguage(settings.newsLanguage);
          if (settings.newsCountry !== undefined) setNewsCountry(settings.newsCountry);
          if (settings.noHashtags !== undefined) setNoHashtags(settings.noHashtags);
          if (settings.noEmojis !== undefined) setNoEmojis(settings.noEmojis);
          if (settings.casualGrammar !== undefined) setCasualGrammar(settings.casualGrammar);
          if (settings.maxCharacters !== undefined) setMaxCharacters(settings.maxCharacters);
        }
      } catch (error) {
        console.error('Failed to load automation settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [jobName]);

  // Build final system prompt with modifiers
  const buildFinalSystemPrompt = () => {
    let finalPrompt = systemPrompt;

    const modifiers: string[] = [];

    if (noHashtags) {
      modifiers.push('- Never use hashtags in your responses');
    }

    if (noEmojis) {
      modifiers.push('- Never use emojis in your responses');
    }

    if (casualGrammar) {
      modifiers.push('- Write with casual grammar like a real person texting (e.g., "hey how are u", "thats really cool", use contractions, drop apostrophes, lowercase)');
      modifiers.push('- Make it feel natural and human, not formal or perfect');
    }

    if (maxCharacters !== '280') {
      modifiers.push(`- Keep your responses under ${maxCharacters} characters (strict limit)`);
    }

    if (modifiers.length > 0) {
      finalPrompt = `${finalPrompt}\n\nSTYLE RULES:\n${modifiers.join('\n')}`;
    }

    return finalPrompt;
  };

  // Save settings to database
  const saveSettings = async (overrideSettings?: Partial<{
    interval: string;
    systemPrompt: string;
    enabled: boolean;
    searchQuery: string;
    minimumLikes: number;
    minimumRetweets: number;
    searchFromToday: boolean;
    removeLinks: boolean;
    removeMedia: boolean;
    isThread: boolean;
    threadLength: number;
    useNewsResearch: boolean;
    newsTopic: string;
    newsLanguage: string;
    newsCountry: string;
    noHashtags: boolean;
    noEmojis: boolean;
    casualGrammar: boolean;
    maxCharacters: string;
  }>) => {
    const settings = {
      interval,
      systemPrompt: buildFinalSystemPrompt(),
      enabled,
      searchQuery,
      minimumLikes,
      minimumRetweets,
      searchFromToday,
      removeLinks,
      removeMedia,
      isThread,
      threadLength,
      useNewsResearch,
      newsTopic,
      newsLanguage,
      newsCountry,
      noHashtags,
      noEmojis,
      casualGrammar,
      maxCharacters,
      ...overrideSettings,
    };

    try {
      await fetch('/api/legacy/automation/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobName,
          settings,
        }),
      });
    } catch (error) {
      console.error('Failed to save automation settings:', error);
    }
  };

  // Control job (start/stop) via scheduler
  const controlJob = async (action: 'start' | 'stop') => {
    try {
      const response = await fetch('/api/legacy/jobs/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          jobName,
          interval,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`Failed to ${action} job:`, data.error);
        showApiError(data.error || `Failed to ${action} job`);
        return false;
      }

      console.log(`✅ ${data.message}`);
      return true;
    } catch (error) {
      console.error(`Error ${action}ing job:`, error);
      showApiError(`Failed to ${action} job`);
      return false;
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    window.dispatchEvent(new CustomEvent('cat:job-start'));

    try {
      const body = jobName === 'reply-to-tweets'
        ? {
            minimumLikesCount: minimumLikes,
            minimumRetweetsCount: minimumRetweets,
            searchFromToday,
            removePostsWithLinks: removeLinks,
            removePostsWithMedia: removeMedia,
          }
        : {};

      const response = await fetch(`/api/legacy/jobs/trigger?job=${jobName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (response.ok) {
        setTestResult({ success: true, message: data.message });
        showTwitterSuccess(data.message || 'Job completed successfully');
        fireSuccessConfetti();
      } else {
        setTestResult({ success: false, message: data.error || 'Unknown error' });

        if (response.status === 403) {
          showTwitter403Error(data.details || data.error);
        } else if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          showTwitter429Error(retryAfter ? parseInt(retryAfter) : undefined);
        } else {
          showApiError(data.error || data.details || 'Job failed to execute');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTestResult({ success: false, message: `Failed: ${errorMessage}` });
      showApiError(`Failed to execute job: ${errorMessage}`);
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
    <div className="group relative flex flex-col rounded-lg border border-border/50 bg-surface/80 backdrop-blur-sm shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 overflow-hidden">
      {/* Status Indicator Bar */}
      <div className={`h-1 w-full transition-all duration-300 ${
        enabled
          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
          : 'bg-gray-200 dark:bg-gray-700'
      }`} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-black text-base tracking-tight">{title}</h3>
              {/* Status Badge */}
              {enabled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Active
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-secondary line-clamp-2 leading-relaxed">{description}</p>
            )}
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={async (checked) => {
              setEnabled(checked);
              await saveSettings({ enabled: checked });
              await controlJob(checked ? 'start' : 'stop');
            }}
            disabled={loading}
          />
        </div>

        {/* Schedule Info */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-md bg-background/50 border border-border/30">
          <Settings2 className="h-3.5 w-3.5 text-secondary" />
          <span className="text-xs font-medium text-secondary">{getScheduleLabel(interval)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-border/30">
          {/* Test Button - Primary CTA */}
          <Button
            onClick={handleTest}
            disabled={testing}
            size="sm"
            className="flex-1 h-9 text-xs gap-1.5 bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200"
          >
            {testing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                <span>Test Run</span>
              </>
            )}
          </Button>

          {/* Settings Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 border-border/50 hover:bg-background/80 hover:border-primary/50 transition-all"
              >
                <MoreHorizontal className="h-4 w-4 text-foreground/70 hover:text-foreground transition-colors" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* Schedule Option */}
              <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Settings2 className="h-4 w-4 mr-2" />
                    <span>Schedule</span>
                  </DropdownMenuItem>
                </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-surface border-border" onCloseAutoFocus={async () => {
            await saveSettings();
            if (enabled) {
              await controlJob('stop');
              await controlJob('start');
            }
          }}>
            <DialogHeader>
              <DialogTitle className="text-base font-black">Schedule</DialogTitle>
              <DialogDescription className="text-xs text-secondary">
                Choose when this automation runs
              </DialogDescription>
            </DialogHeader>
            <SchedulePicker value={interval} onChange={setInterval} />
              </DialogContent>
            </Dialog>

            {/* Prompt Option */}
            <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <span>Edit Prompt</span>
                </DropdownMenuItem>
              </DialogTrigger>
          <DialogContent className="sm:max-w-2xl bg-surface border-border" onCloseAutoFocus={() => saveSettings()}>
            <DialogHeader>
              <DialogTitle className="text-base font-black">System Prompt</DialogTitle>
              <DialogDescription className="text-xs text-secondary">
                Configure how the AI behaves for this automation
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Main prompt textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Base Prompt</label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Enter your system prompt..."
                  className="min-h-[150px] bg-background border-border text-sm resize-none"
                />
              </div>

              {/* Style modifiers */}
              <div className="space-y-3 border-t border-border pt-3">
                <label className="text-xs font-medium text-foreground">Style Options</label>

                <div className="grid grid-cols-2 gap-3">
                  {/* No Hashtags */}
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={noHashtags}
                      onChange={(e) => setNoHashtags(e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-input accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
                    />
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                      No hashtags
                    </span>
                  </label>

                  {/* No Emojis */}
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={noEmojis}
                      onChange={(e) => setNoEmojis(e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-input accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
                    />
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                      No emojis
                    </span>
                  </label>

                  {/* Casual Grammar */}
                  <label className="flex items-center gap-2 cursor-pointer group col-span-2">
                    <input
                      type="checkbox"
                      checked={casualGrammar}
                      onChange={(e) => setCasualGrammar(e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-input accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
                    />
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                      Casual grammar (like texting - more human/realistic)
                    </span>
                  </label>
                </div>

                {/* Character Limit */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Max Characters per Tweet
                  </label>
                  <select
                    value={maxCharacters}
                    onChange={(e) => setMaxCharacters(e.target.value)}
                    className="h-8 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <option value="280">280 (Twitter max)</option>
                    <option value="200">200 (Short & punchy)</option>
                    <option value="150">150 (Very concise)</option>
                    <option value="100">100 (Ultra brief)</option>
                  </select>
                  <p className="text-[10px] text-secondary">
                    AI will aim to stay under this character limit
                  </p>
                </div>
              </div>
            </div>

              <Button onClick={() => { setPromptOpen(false); saveSettings(); }} className="h-8 text-xs">
                Save
              </Button>
            </DialogContent>
          </Dialog>

          {/* Thread Options (only for post-tweets) */}
          {jobName === 'post-tweets' && (
            <>
              <DropdownMenuSeparator />
              <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Filter className="h-4 w-4 mr-2" />
                    <span>Thread Options</span>
                  </DropdownMenuItem>
                </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-surface border-border" onCloseAutoFocus={() => saveSettings()}>
              <DialogHeader>
                <DialogTitle className="text-base font-black">Thread Options</DialogTitle>
                <DialogDescription className="text-xs text-secondary">
                  Configure thread length and news research
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Max Tweets in Thread
                  </label>
                  <Input
                    type="number"
                    value={threadLength}
                    onChange={(e) => setThreadLength(Number(e.target.value))}
                    min={2}
                    max={10}
                    className="h-8 bg-background border-border text-sm"
                  />
                  <p className="text-[10px] text-secondary">
                    Number of tweets to split content into (2-10)
                  </p>
                </div>

                <div className="space-y-3 border-t border-border pt-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      News Topic
                    </label>
                    <select
                      value={newsTopic}
                      onChange={(e) => setNewsTopic(e.target.value)}
                      className="h-8 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {NEWS_TOPICS.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-secondary">
                      Fetch trending news from this topic to create threads
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Language
                      </label>
                      <select
                        value={newsLanguage}
                        onChange={(e) => setNewsLanguage(e.target.value)}
                        className="h-8 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {NEWS_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Country
                      </label>
                      <select
                        value={newsCountry}
                        onChange={(e) => setNewsCountry(e.target.value)}
                        className="h-8 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {NEWS_COUNTRIES.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

                <Button onClick={() => { setFiltersOpen(false); saveSettings(); }} className="h-8 text-xs">
                  Save Options
                </Button>
              </DialogContent>
            </Dialog>
            </>
          )}

          {/* Search Options (only for reply-to-tweets) */}
          {jobName === 'reply-to-tweets' && (
            <>
              <DropdownMenuSeparator />
              <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Filter className="h-4 w-4 mr-2" />
                    <span>Search Options</span>
                  </DropdownMenuItem>
                </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-surface border-border" onCloseAutoFocus={() => saveSettings()}>
              <DialogHeader>
                <DialogTitle className="text-base font-black">Search Options</DialogTitle>
                <DialogDescription className="text-xs text-secondary">
                  Configure tweet search criteria for better targeting
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Search Query
                  </label>
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g., AI OR artificial intelligence"
                    className="h-8 bg-background border-border text-sm"
                  />
                  <p className="text-[10px] text-secondary">
                    Keywords to search for in tweets
                  </p>
                </div>

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
                      className="h-8 bg-background border-border text-sm"
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
                      className="h-8 bg-background border-border text-sm"
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

                <Button onClick={() => { setFiltersOpen(false); saveSettings(); }} className="h-8 text-xs">
                  Save Options
                </Button>
              </DialogContent>
            </Dialog>
            </>
          )}

          {/* History (for reply-to-tweets and post-tweets) */}
          {(jobName === 'reply-to-tweets' || jobName === 'post-tweets') && (
            <>
              <DropdownMenuSeparator />
              <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <History className="h-4 w-4 mr-2" />
                    <span>View History</span>
                  </DropdownMenuItem>
                </DialogTrigger>
            <DialogContent className="sm:max-w-[90vw] max-h-[85vh] bg-surface border-border overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-base font-black">
                  {jobName === 'reply-to-tweets' ? 'Reply History' : 'Posted Threads History'}
                </DialogTitle>
                <DialogDescription className="text-xs text-secondary">
                  {jobName === 'reply-to-tweets'
                    ? "View all tweets you've replied to with engagement metrics"
                    : "View all threads you've posted with news research"
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto max-h-[calc(85vh-8rem)]">
                {jobName === 'reply-to-tweets' ? (
                  <ReplyHistoryTable />
                ) : (
                  <PostedThreadsHistoryTable />
                )}
              </div>
            </DialogContent>
          </Dialog>
            </>
          )}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {/* Test Result Indicator */}
      {testResult && (
        <div className="absolute right-6 top-6 z-10">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm shadow-lg animate-in fade-in slide-in-from-top duration-300 ${
            testResult.success
              ? 'bg-green-100/90 dark:bg-green-900/50 border border-green-200 dark:border-green-800'
              : 'bg-red-100/90 dark:bg-red-900/50 border border-red-200 dark:border-red-800'
          }`}>
            {testResult.success ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">Success</span>
              </>
            ) : (
              <>
                <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                <span className="text-xs font-medium text-red-700 dark:text-red-300">Failed</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
