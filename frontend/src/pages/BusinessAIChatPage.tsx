import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const BusinessAIChatPage: React.FC = () => {
  const { t } = useTranslation();
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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: 'user', content: question }],
          context: {},
        }),
      });
      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(text || "Non-JSON response");
      }
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setAnswer(data?.message || "");
    } catch (err: any) {
      setError(err?.message || t('businessAiChat.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">{t('businessAiChat.title')}</h1>
      <form onSubmit={submit} className="flex gap-2 mb-4">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder={t('businessAiChat.placeholder')}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          className="bg-primary text-white px-4 py-2 rounded disabled:opacity-60"
          disabled={loading || !question.trim()}
        >
          {loading ? t('businessAiChat.asking') : t('businessAiChat.askButton')}
        </button>
      </form>

      {error && (
        <div className="text-red-600 mb-2 text-sm">{error}</div>
      )}

      <div className="border rounded p-3 min-h-[120px] whitespace-pre-wrap">
        {answer || (loading ? t('businessAiChat.thinking') : t('businessAiChat.responseWillAppear'))}
      </div>
    </div>
  );
};

export default BusinessAIChatPage;


