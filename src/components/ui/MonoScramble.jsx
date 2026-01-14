import { useState, useEffect } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';

export default function MonoScramble({ children, speed = 40, className = "" }) {
  const text = String(children || '');
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((letter, index) => {
            if (index < iteration) return text[index];
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join('')
      );

      if (iteration >= text.length) clearInterval(interval);
      iteration += 1 / 3;
    }, speed);
    
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span className={`font-mono tracking-widest ${className}`}>
      {display}
    </span>
  );
}
