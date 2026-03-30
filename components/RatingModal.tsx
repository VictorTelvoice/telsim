import React, { useState } from 'react';
import { Star, X, Loader2, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface RatingModalProps {
  /** Llamado cuando el usuario califica o cierra el modal */
  onDone: () => void;
}

const LABELS: Record<number, string> = {
  1: 'Muy malo',
  2: 'Malo',
  3: 'Regular',
  4: 'Bueno',
  5: 'Excelente',
};

const feedbackStorageKey = (userId?: string | null) =>
  userId ? `telsim_feedback_completed:${userId}` : 'telsim_feedback_completed:guest';

const RatingModal: React.FC<RatingModalProps> = ({ onDone }) => {
  const { user } = useAuth();
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const activeStars = hovered || selected;

  const persistFeedbackCompletion = async (status: 'rated' | 'dismissed') => {
    if (!user?.id) return;
    localStorage.setItem(feedbackStorageKey(user.id), status);
    const { error } = await supabase
      .from('user_feedback_status')
      .upsert({
        user_id: user.id,
        status,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.warn('[RatingModal] feedback status persistence failed', error);
    }
  };

  const submit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('user_ratings').insert({
        user_id: user?.id ?? null,
        rating: selected,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      await persistFeedbackCompletion('rated');
      setDone(true);
      setTimeout(onDone, 1600);
    } catch (error) {
      console.error('[RatingModal] submit failed', error);
    } finally {
      setSubmitting(false);
    }
  };

  const dismiss = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await persistFeedbackCompletion('dismissed');
    } finally {
      setSubmitting(false);
      onDone();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
    >
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {done ? (
          /* Thank-you state */
          <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
            <div className="size-16 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Heart className="size-7 text-primary fill-primary" />
            </div>
            <p className="text-base font-black text-slate-900 dark:text-white">¡Gracias por tu opinión!</p>
            <p className="text-xs font-medium text-slate-400">Tu calificación nos ayuda a mejorar.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-[15px] font-black text-slate-900 dark:text-white leading-tight">
                  ¿Cómo fue tu experiencia?
                </p>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                  Tu opinión nos ayuda a mejorar Telsim
                </p>
              </div>
              <button
                onClick={dismiss}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Stars */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setSelected(n)}
                    className="p-1.5 rounded-xl transition-all active:scale-90"
                  >
                    <Star
                      className={`size-9 transition-all ${
                        n <= activeStars
                          ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                          : 'text-slate-200 dark:text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {activeStars > 0 && (
                <p className="text-center text-[11px] font-black text-amber-500 uppercase tracking-widest mt-2 h-4">
                  {LABELS[activeStars]}
                </p>
              )}

              {/* Comment (optional) */}
              {selected > 0 && (
                <div className="mt-4">
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Comentario opcional..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-primary transition-all resize-none placeholder:text-slate-300 dark:placeholder:text-slate-500"
                  />
                  <p className="text-right text-[9px] text-slate-300 mt-0.5">{comment.length}/500</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={dismiss}
                className="flex-1 h-11 rounded-2xl border border-slate-200 dark:border-slate-700 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Omitir
              </button>
              <button
                onClick={submit}
                disabled={!selected || submitting}
                className="flex-1 h-11 rounded-2xl bg-primary text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-md shadow-primary/30 transition-all active:scale-95"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Enviar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RatingModal;
