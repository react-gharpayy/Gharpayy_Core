import { NextRequest, NextResponse } from 'next/server';
import { AIProvider, ChatMessage } from '@/lib/ai-provider';
import { getAuthUser } from '@/lib/auth';
import { buildOperationalContext, generateDeterministicBriefing } from '@/modules/coach-ai/lib/context-engine';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { messages, operationalData } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
    }

    // Build operational context for the AI
    const context = buildOperationalContext(operationalData || {});
    const briefing = generateDeterministicBriefing(context);

    const systemPrompt = `
You are Coach AI, the Elite Operational Strategist for Gharpayy.
Your persona: Senior Operations Director. Direct, analytical, decisive, and execution-focused.

OPERATIONAL CONTEXT:
Gharpayy is a high-velocity enterprise managing multiple hubs and teams. Key pillars: Attendance, Punctuality (On Time Rate), Task Execution (Velocity), and Data Accountability (Tracker Compliance).

DETERMINISTIC DATA (TODAY'S SNAPSHOT):
${briefing}

YOUR STRATEGIC MANDATE:
1. **Managerial Specificity**: Avoid generic motivational phrases. Instead of "Keep up the good work," say "Jayanagar Hub is exceeding velocity targets by 12%—analyze their workflow for potential rollout to underperforming hubs."
2. **Tactical Intervention**: If you see attendance drops or low tracker compliance, suggest immediate management syncs.
3. **Risk Correlation**: Correlate high velocity with low attendance as a "High Burnout Risk." Correlate high attendance with low task completion as a "Training/Skill Gap."
4. **Behavioral Accountability**: Treat low tracker compliance as an execution failure. Suggest accountability coaching.
5. **Conversational Fluidity**: Be natural and vary your phrasing. Do not use robotic templates.
6. **Output Formatting**: Use Markdown (# for headers, - for lists, **bold** for key metrics).

INTELLECTUAL GUIDELINES:
- No "therapy-style" talk.
- No robotic encouragement.
- Prioritize actionable intelligence over descriptive summaries.
- At the end of every response, provide 2-3 tactical follow-up questions starting with "FOLLOW_UP: ".

Current Context: ${user.fullName} | System: ARENA OS | Mode: Executive Briefing
`;

    // Map frontend messages to AIProvider format
    const chatHistory: ChatMessage[] = messages.map((m: any) => ({
      role: m.role,
      content: m.content
    }));

    const groqMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.slice(-8) // Context window: last 8 messages
    ];

    const aiResponse = await AIProvider.generateChatCompletion(groqMessages, {
      temperature: 0.8, // Varied, creative but grounded
      maxTokens: 1500
    });

    // Parse follow-ups with robustness (case-insensitive, trim markers)
    let finalContent = aiResponse.content;
    const followUps: string[] = [];
    
    const followUpMarker = /FOLLOW_UP:/gi;
    if (followUpMarker.test(finalContent)) {
      const parts = finalContent.split(followUpMarker);
      finalContent = parts[0].trim();
      for (let i = 1; i < parts.length; i++) {
        const suggestion = parts[i].split('\n')[0].trim();
        if (suggestion) {
          // Clean up numbering or bullets
          const cleaned = suggestion.replace(/^[0-9.\-\s*]+/, '').trim();
          if (cleaned && !followUps.includes(cleaned)) followUps.push(cleaned);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      content: finalContent,
      followUps: followUps.slice(0, 3),
      usage: aiResponse.usage,
    });
  } catch (error: any) {
    console.error('[Coach AI API Error]:', error);
    return NextResponse.json({ 
      error: 'Coaching engine temporarily unavailable',
      details: error.message 
    }, { status: 500 });
  }
}
