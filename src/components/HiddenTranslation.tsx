import React, { useState } from 'react';

export const HiddenTranslation = ({ text, className = '' }: { text: string; className?: string }) => {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        setIsRevealed(true);
      }}
      className={`transition-all duration-300 ${
        isRevealed 
          ? 'opacity-80 blur-none cursor-text' 
          : 'opacity-40 blur-[4px] cursor-pointer hover:blur-[3px]'
      } ${className}`}
      title={isRevealed ? '' : 'Toque para revelar a tradução'}
    >
      {text}
    </div>
  );
};
