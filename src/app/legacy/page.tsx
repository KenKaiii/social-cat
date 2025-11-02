'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Twitter, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LegacyPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Legacy Automation System</h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              These are pre-configured job-based automations kept for reference and teaching purposes.
              For new automations, use the <Link href="/dashboard/workflows" className="underline font-medium">Workflows</Link> system which is more flexible and powerful.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Social Media Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Twitter className="h-5 w-5" />
                Social Media Automation
              </CardTitle>
              <CardDescription>
                Pre-configured jobs for Twitter and YouTube automation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                <p>• Post Tweets - AI-generated Twitter threads</p>
                <p>• Reply to Tweets - Engage with relevant content</p>
                <p>• YouTube Comments - Auto-reply to video comments</p>
              </div>
              <Button asChild className="w-full">
                <Link href="/legacy/social-media">
                  View Social Media Jobs
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Content Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Content Automation
              </CardTitle>
              <CardDescription>
                Pre-configured jobs for WordPress blogging
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                <p>• WordPress Auto-Blog - Research and publish blog posts</p>
                <p>• Trending news research</p>
                <p>• SEO-optimized content generation</p>
              </div>
              <Button asChild className="w-full">
                <Link href="/legacy/content">
                  View Content Jobs
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Migration Note */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Why migrate to Workflows?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>The new Workflow system offers:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>100+ composable modules (APIs, databases, social media, AI, utilities)</li>
              <li>Visual workflow configuration and management</li>
              <li>Multiple triggers (cron, webhooks, Telegram/Discord bots, manual)</li>
              <li>Execution history and detailed logs</li>
              <li>Import/export workflow templates</li>
              <li>Centralized credential management</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
