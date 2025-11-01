import React, { useState } from 'react';

const BusinessAIChatPage: React.FC = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const res = await fetch("/.netlify/functions/groq-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(text || "Non-JSON response");
      }
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setAnswer(data?.answer || "");
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Business AI Chat</h1>
      <form onSubmit={submit} className="flex gap-2 mb-4">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Ask something like: What are my popular days?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
          disabled={loading || !question.trim()}
        >
          {loading ? 'Asking…' : 'Ask'}
        </button>
      </form>

      {error && (
        <div className="text-red-600 mb-2 text-sm">{error}</div>
      )}

      <div className="border rounded p-3 min-h-[120px] whitespace-pre-wrap">
        {answer || (loading ? 'Thinking…' : 'The response will appear here.')}
      </div>
    </div>
  );
};

export default BusinessAIChatPage;


