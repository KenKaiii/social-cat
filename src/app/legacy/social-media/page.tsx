'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WorkflowTile } from '@/components/automation/WorkflowTile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Twitter, Youtube, Instagram } from 'lucide-react';

export default function SocialMediaPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        {/* Platform Tabs */}
        <Tabs defaultValue="twitter" className="w-full animate-slide-up">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="twitter" className="flex items-center gap-2">
              <Twitter className="h-4 w-4" />
              Twitter
            </TabsTrigger>
            <TabsTrigger value="youtube" className="flex items-center gap-2">
              <Youtube className="h-4 w-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="instagram" className="flex items-center gap-2">
              <Instagram className="h-4 w-4" />
              Instagram
            </TabsTrigger>
          </TabsList>

          {/* Twitter Tab */}
          <TabsContent value="twitter" className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <WorkflowTile
                title="Post Threads"
                description="Create and post engaging Twitter threads automatically with AI-powered content generation from trending news"
                jobName="post-tweets"
                defaultInterval="0 */4 * * *"
                defaultPrompt="Create an engaging thread about this news. Write a cohesive narrative that flows naturally. Be insightful, authentic, and thought-provoking. Add your unique perspective and analysis."
              />

              <WorkflowTile
                title="Reply to Tweets"
                description="Find and reply to relevant tweets with authentic, thoughtful responses that drive real engagement"
                jobName="reply-to-tweets"
                defaultInterval="*/15 * * * *"
                defaultSearchQuery="AI OR artificial intelligence"
                defaultPrompt="You are a thoughtful Twitter user who engages authentically with interesting content. Reply naturally as if you're having a genuine conversation with someone interesting.

Style:
- Write like a real person, not a bot or brand account
- Be conversational and casual (contractions are good!)
- Keep it under 280 characters
- Match the energy and tone of the original tweet

Content:
- Add genuine insight, a follow-up question, or personal perspective
- Share a related thought or build on their idea
- If they're asking something, give a helpful answer
- Avoid generic praise like 'Great post!' or 'Thanks for sharing!'

Don't:
- Sound promotional, salesy, or overly enthusiastic
- Use hashtags or emoji unless the original tweet does
- Make it about yourself unless contextually relevant
- Be controversial, political, or offensive

Goal: Have a real conversation, not broadcast content."
              />
            </div>
          </TabsContent>

          {/* YouTube Tab */}
          <TabsContent value="youtube" className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <WorkflowTile
                title="Reply to Comments"
                description="Automatically respond to YouTube video comments with helpful, engaging replies that build community"
                jobName="check-youtube-comments"
                defaultInterval="*/30 * * * *"
                defaultPrompt="You are a friendly YouTube creator. Reply to comments on your videos in a helpful, engaging way. Keep responses concise and positive."
              />

              <WorkflowTile
                title="Fetch Comments for Analysis"
                description="Collect and analyze YouTube comments to identify trends, common questions, and engagement opportunities"
                jobName="fetch-youtube-comments-analysis"
                defaultInterval="0 */6 * * *"
                defaultPrompt="Analyze YouTube comments to identify common questions, feedback themes, and engagement opportunities."
              />
            </div>
          </TabsContent>

          {/* Instagram Tab */}
          <TabsContent value="instagram" className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <WorkflowTile
                title="Reply to Comments"
                description="Engage with your Instagram community by automatically responding to post comments with authentic, positive replies"
                jobName="instagram-reply-comments"
                defaultInterval="*/30 * * * *"
                defaultPrompt="You are a friendly Instagram creator. Reply to comments on your posts in an engaging, authentic way. Keep it brief and positive."
              />

              <WorkflowTile
                title="Reply to DMs"
                description="Manage Instagram direct messages efficiently with AI-powered professional and helpful responses"
                jobName="instagram-reply-dms"
                defaultInterval="*/15 * * * *"
                defaultPrompt="You are a helpful assistant. Reply to Instagram direct messages professionally and helpfully. Be concise and friendly."
              />
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  );
}
