import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { IoJournal, IoSparkles, IoCalendar, IoCheckmarkCircle } from 'react-icons/io5';

const MOOD_EMOJIS = {
  happy: '😄',
  sad: '😢',
  angry: '😠',
  neutral: '😐',
  surprised: '😲',
  fearful: '😨',
  disgusted: '🤢'
};

const MOOD_COLORS = {
  happy: '#fcb85c',
  sad: '#5c8cfc',
  angry: '#fc5ca0',
  neutral: '#9090a8',
  surprised: '#5cfcd8',
  fearful: '#7c5cfc',
  disgusted: '#5cfcd8'
};

export default function ReflectionHub() {
  const { API, toast } = useApp();
  const [questions, setQuestions] = useState([
    "What made you happiest this week?",
    "What was a challenge you faced and how did you overcome it?",
    "Who is one person you are grateful for this week and why?",
    "What did you learn about yourself through your emotions this week?",
    "Which song resonated with you the most this week and why?"
  ]);
  const [selectedPrompt, setSelectedPrompt] = useState("What made you happiest this week?");
  const [journalContent, setJournalContent] = useState('');
  const [journalMood, setJournalMood] = useState('happy');
  const [submitting, setSubmitting] = useState(false);
  const [reflections, setReflections] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestionsAndReflections = async () => {
    try {
      const qRes = await API.get('/wellness/reflection/questions').catch(() => null);
      if (qRes && qRes.data.questions) {
        setQuestions(qRes.data.questions);
        setSelectedPrompt(qRes.data.questions[0]);
      }
      
      const rRes = await API.get('/wellness/journal');
      const allEntries = rRes.data.entries || [];
      // Filter entries that actually have a prompt answered
      const filtered = allEntries.filter(entry => entry.prompt);
      setReflections(filtered);
    } catch (err) {
      console.error(err);
      toast('Failed to load reflection data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestionsAndReflections();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!journalContent.trim()) {
      toast('Please write your reflection content', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await API.post('/wellness/journal', {
        content: journalContent,
        mood: journalMood,
        prompt: selectedPrompt
      });
      toast('Deep reflection saved successfully!', 'success');
      setJournalContent('');
      
      // Refresh list
      fetchQuestionsAndReflections();
    } catch (err) {
      console.error(err);
      toast('Failed to save reflection entry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <div className="skeleton" style={{ height: 160, marginBottom: 24, borderRadius: 20 }} />
        <div className="skeleton" style={{ height: 320, borderRadius: 20 }} />
      </div>
    );
  }

  return (
    <div className="page-content animate-fade" style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      {/* Title */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
          🧠 Reflection Hub
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Deepen your journaling with AI-powered weekly questions to uncover emotional patterns and insights.
        </p>
      </div>

      <div className="responsive-grid-12-08" style={{ gap: 24, marginBottom: 32 }}>
        
        {/* Left Card: Reflection Entry */}
        <div className="glass-card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <span style={{ fontSize: 24 }}>✍️</span>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>New Reflection</h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Prompt Selector */}
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 10, fontWeight: 600 }}>
                Choose a reflection prompt:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {questions.map((q, idx) => {
                  const isSelected = selectedPrompt === q;
                  const isWeeklyMain = idx === 0;
                  return (
                    <div
                      key={q}
                      onClick={() => setSelectedPrompt(q)}
                      style={{
                        padding: '14px 18px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'rgba(124,92,252,0.08)' : 'rgba(255,255,255,0.01)',
                        border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        boxShadow: isSelected ? '0 0 12px rgba(124,92,252,0.1)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <IoSparkles style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                          <span style={{ fontSize: 14, fontWeight: isSelected ? 600 : 400, color: isSelected ? 'white' : 'var(--text-primary)' }}>
                            {q}
                          </span>
                        </div>
                        {isWeeklyMain && (
                          <span style={{
                            fontSize: 10,
                            padding: '3px 8px',
                            background: 'var(--gradient-main)',
                            borderRadius: 'var(--radius-full)',
                            color: 'white',
                            fontWeight: 700
                          }}>
                            Weekly Special
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mood selector */}
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 10, fontWeight: 600 }}>
                How does this prompt make you feel?
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.keys(MOOD_EMOJIS).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setJournalMood(m)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: journalMood === m ? `${MOOD_COLORS[m]}18` : 'rgba(255,255,255,0.02)',
                      border: journalMood === m ? `2px solid ${MOOD_COLORS[m]}` : '1px solid var(--border-color)',
                      color: journalMood === m ? 'white' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 14,
                      fontWeight: journalMood === m ? 700 : 400,
                      transition: 'all 0.2s ease',
                      boxShadow: journalMood === m ? `0 0 12px ${MOOD_COLORS[m]}33` : 'none'
                    }}
                  >
                    <span>{MOOD_EMOJIS[m]}</span>
                    <span style={{ textTransform: 'capitalize' }}>{m}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Note entry */}
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 10, fontWeight: 600 }}>
                Write your thoughts:
              </label>
              <textarea
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                placeholder="Dive deep. Explore your feelings, the specifics of what happened, and any lessons learned..."
                rows={6}
                style={{ resize: 'vertical', width: '100%', lineHeight: 1.6 }}
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={submitting}
              style={{ alignSelf: 'flex-start', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <IoJournal /> {submitting ? 'Saving...' : 'Save Deep Reflection'}
            </button>
          </form>
        </div>

        {/* Right Card: Curated Highlight Banner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-card" style={{
            padding: 24,
            background: 'linear-gradient(135deg, rgba(124,92,252,0.15) 0%, rgba(92,252,216,0.05) 100%)',
            border: '1px solid rgba(124,92,252,0.3)',
            borderRadius: 'var(--radius-xl)'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              💡 Why Reflect Weekly?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Answering structured weekly questions shifts your journaling from a simple log of events into a **growth-oriented reflection hub**. 
            </p>
            <ul style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, paddingLeft: 20, marginTop: 12 }}>
              <li>Brings clarity to patterns of happiness &amp; stress.</li>
              <li>Fosters self-acceptance and emotional resilience.</li>
              <li>Powers AI recommendations with deeper wellness context.</li>
            </ul>
          </div>
          
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📈 Reflection Streak</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 32 }}>🔥</div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>You are building a custom cognitive check habit. Keep it up to level up achievements!</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Past Reflections History */}
      <div className="glass-card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <IoCalendar size={20} />
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Deep Reflections History</h2>
        </div>

        {reflections.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📓</div>
            <p style={{ fontSize: 14 }}>No deep reflections saved yet. Select a prompt above to log your first reflection!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reflections.map((r) => (
              <div 
                key={r.id} 
                style={{ 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-lg)', 
                  padding: 24,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IoSparkles size={11} /> {r.prompt}
                    </div>
                    <span style={{
                      fontSize: 12, padding: '3px 8px', borderRadius: 'var(--radius-full)',
                      background: `${MOOD_COLORS[r.mood]}12`, border: `1px solid ${MOOD_COLORS[r.mood]}44`,
                      color: MOOD_COLORS[r.mood], display: 'inline-flex', alignItems: 'center', gap: 4
                    }}>
                      <span>{MOOD_EMOJIS[r.mood]}</span>
                      <span style={{ textTransform: 'capitalize' }}>{r.mood}</span>
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(r.timestamp).toLocaleDateString(undefined, { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {r.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
