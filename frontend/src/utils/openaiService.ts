// OpenAI integration via backend HTTP API
export class OpenAIService {
  async chatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) throw new Error('Chat API error');
    const json = await res.json();
    return json?.message || 'Sorry, I could not generate a response.';
  }
}

export const openaiService = new OpenAIService();
