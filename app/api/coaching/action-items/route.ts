import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { canAccessCoaching } from '@/lib/permissions';
import CoachingSession from '@/models/CoachingSession';
import { AIProvider } from '@/lib/ai-provider';
import { connectDB } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !canAccessCoaching(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { sessionId, summaryContext, metricsContext } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    await connectDB();
    const session = await CoachingSession.findById(sessionId).lean();
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const promptContext = `
Employee: ${(session as any).employeeName}
Session Notes: ${(session as any).sharedNotes || ''}
Manager Private Notes: ${(session as any).privateNotes || ''}
AI Summary: ${summaryContext || ''}
Metrics Context: ${metricsContext ? JSON.stringify(metricsContext) : ''}
`;

    const systemPrompt = `You are an Elite Workforce Operations Strategist.
Generate 3-5 intelligent, SMART (Specific, Measurable, Achievable, Relevant, Time-bound) action items based on the provided session notes, metrics, operational context, and AI summary.
Focus on operational reliability, task execution, and measurable outcomes.
Include deadlines, accountability checkpoints, and escalation recommendations if needed.

Return ONLY a JSON array of objects with the following schema, with no markdown code blocks around it:
[
  {
    "title": "Action item title (string)",
    "description": "Detailed explanation, expected outcome, and follow-up (string)"
  }
]
`;

    const response = await AIProvider.generateChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptContext }
      ],
      { maxTokens: 800, temperature: 0.3 }
    );

    let actionItems = [];
    try {
      const text = response.content.replace(/```(?:json)?/gi, '').trim();
      actionItems = JSON.parse(text);
    } catch (err) {
      console.error('Failed to parse AI action items JSON', err, response.content);
      // fallback parsing
      actionItems = [{ title: "AI Generation Error", description: response.content }];
    }

    return NextResponse.json({ ok: true, actionItems });
  } catch (error) {
    console.error('[AI Action Items API] Error:', error);
    return NextResponse.json({ error: 'Failed to generate action items' }, { status: 500 });
  }
}
