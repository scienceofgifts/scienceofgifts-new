import React from 'react';
import { GuideCuratorNote } from '../../types/content';
import { Feather } from 'lucide-react';

export interface CuratorNoteProps {
  note: GuideCuratorNote;
  className?: string;
}

export const CuratorNote: React.FC<CuratorNoteProps> = ({
  note,
  className = '',
}) => {
  return (
    <aside
      aria-label={note.title}
      className={`rounded-2xl border border-[#D5CFC4] bg-[#F4EFE6] p-6 sm:p-7 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D5CFC4] pb-3">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#28537D]">
          <Feather className="h-3.5 w-3.5" />
          <span>{note.kicker}</span>
        </div>
        {note.authorAttribution && (
          <span className="font-serif text-xs italic text-[#62666A]">
            {note.authorAttribution}
          </span>
        )}
      </div>

      <h3 className="mt-4 font-serif text-xl font-bold leading-snug text-[#222426] sm:text-2xl">
        {note.title}
      </h3>

      <p className="mt-3 text-sm leading-[1.75] text-[#292B2D] sm:text-base">
        {note.body}
      </p>

      {note.takeaway && (
        <div className="mt-4 border-t border-[#D5CFC4] pt-3.5 text-xs leading-relaxed text-[#222426] sm:text-sm">
          <span className="font-bold uppercase tracking-[0.12em] text-[#28537D]">
            Curatorial Rule of Thumb:{' '}
          </span>
          <span className="font-serif italic">{note.takeaway}</span>
        </div>
      )}
    </aside>
  );
};
