import { useEffect, useState } from 'react';

/** Barra fina bajo la navegación que indica cuánto del artículo se ha leído. */
export default function ReadingProgress({ targetId }: { targetId: string }) {
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const update = () => {
      const el = document.getElementById(targetId);
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      const total = height - window.innerHeight;
      const value = total > 0 ? Math.min(1, Math.max(0, -top / total)) : 1;
      setProgress(value);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [targetId]);

  return (
    <div className="fixed inset-x-0 top-16 z-30 h-0.5 bg-transparent" aria-hidden="true">
      <div
        className="h-full origin-left bg-gradient-to-r from-indigo-500 to-violet-500 transition-transform duration-75"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
