import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { canAccessCoaching } from '@/lib/permissions';
import { AIProvider } from '@/lib/ai-provider';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !canAccessCoaching(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { notes } = await req.json();
    if (!notes) {
      return NextResponse.json({ error: 'Missing notes' }, { status: 400 });
    }

    const systemPrompt = `You are an Elite Workforce Operations Strategist assisting a manager during a 1:1.
Analyze the following manager notes and live discussion points.
1. Summarize the notes.
2. Detect any indicators of burnout, disengagement, accountability concerns, or communication issues.
3. Generate follow-up questions, intervention suggestions, coaching prompts, and escalation recommendations.

Format your response in Markdown with the following sections:
## Summary
## Detected Signals
## Suggested Questions
## Intervention & Coaching Prompts
`;

    const response = await AIProvider.generateChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: notes }
      ],
      { maxTokens: 800, temperature: 0.5 }
    );

    return NextResponse.json({ ok: true, assist: response.content });
  } catch (error) {
    console.error('[AI Discussion Assist API] Error:', error);
    return NextResponse.json({ error: 'Failed to generate discussion assist' }, { status: 500 });
  }
}
