/**
 * modules/coach-ai/lib/followup-engine.ts
 * 
 * Generates contextual follow-up questions for executive investigation.
 */

import { OperationalOntology } from './context-engine';

export const getSuggestedFollowUps = (context: OperationalOntology, lastQuery: string): string[] => {
  const suggestions: string[] = [];

  const lowerQuery = lastQuery.toLowerCase();

  // Logic based on previous query and current context
  if (lowerQuery.includes('summary') || lowerQuery.includes('operations')) {
    suggestions.push("Which hubs are currently at-risk?");
    suggestions.push("Show punctuality breakdown by zone.");
    suggestions.push("Identify top 3 execution bottlenecks.");
  } else if (lowerQuery.includes('hub') || lowerQuery.includes('at-risk')) {
    suggestions.push("Who are the managers for these hubs?");
    suggestions.push("Compare attendance vs previous week.");
    suggestions.push("Which operators have the highest absenteeism?");
  } else if (lowerQuery.includes('performer') || lowerQuery.includes('operator')) {
    suggestions.push("Show recruiter conversion rates.");
    suggestions.push("Recommend coaching for bottom performers.");
    suggestions.push("Compare hub performance averages.");
  } else if (lowerQuery.includes('risk') || lowerQuery.includes('attendance')) {
    suggestions.push("Show task backlog aging.");
    suggestions.push("Which teams have the most blocked tasks?");
    suggestions.push("Recommend immediate intervention actions.");
  } else {
    // Default high-level investigations
    suggestions.push("Summarize today's execution health.");
    suggestions.push("Show organizational risk assessment.");
    suggestions.push("Identify top-performing operators.");
  }

  return suggestions.slice(0, 4); // Keep it tight (max 4)
};
