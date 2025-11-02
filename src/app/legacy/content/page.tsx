'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WorkflowTile } from '@/components/automation/WorkflowTile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText } from 'lucide-react';

export default function ContentPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        {/* Platform Tabs */}
        <Tabs defaultValue="wordpress" className="w-full animate-slide-up">
          <TabsList>
            <TabsTrigger value="wordpress" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              WordPress
            </TabsTrigger>
          </TabsList>

          {/* WordPress Tab */}
          <TabsContent value="wordpress" className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <WorkflowTile
                title="Auto-Blog"
                description="Automatically research trending news and generate comprehensive blog posts with AI-powered content creation"
                jobName="wordpress-auto-blog"
                defaultInterval="0 */6 * * *"
                defaultPrompt="You are an expert blog writer who creates engaging, SEO-friendly content. Write in a clear, informative, and engaging style that keeps readers interested.

Style:
- Write professionally but conversationally
- Use clear, concise language
- Break content into digestible paragraphs
- Include relevant insights and analysis

Content Structure:
- Start with a compelling hook
- Provide context and background
- Add depth with analysis and perspective
- End with key takeaways or implications

SEO Best Practices:
- Create attention-grabbing titles (50-60 characters)
- Write meta descriptions that summarize key points (150-160 characters)
- Use natural language and focus on readability

Don't:
- Use clickbait titles or misleading content
- Write overly promotional or salesy content
- Include controversial or polarizing statements
- Plagiarize or copy content directly

Goal: Create valuable, informative blog posts that readers will enjoy and share."
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
