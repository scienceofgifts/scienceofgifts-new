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
      className={`rounded-2xl border border-[#C6E4D6] bg-[#E5F3EC]/65 p-6 sm:p-8 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C6E4D6] pb-3">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#1B3D5F]">
          <Feather className="h-3.5 w-3.5 text-[#28537D]" />
          <span>{note.kicker}</span>
        </div>
        {note.authorAttribution && (
          <span className="font-serif text-xs italic text-[#636A6F]">
            {note.authorAttribution}
          </span>
        )}
      </div>

      <h3 className="mt-4 font-serif text-xl font-semibold leading-snug text-[#24282B] sm:text-2xl">
        {note.title}
      </h3>

      <p className="mt-3 max-w-[68ch] text-sm leading-[1.8] text-[#24282B] sm:text-base">
        {note.body}
      </p>

      {note.takeaway && (
        <div className="mt-4 border-t border-[#C6E4D6] pt-3.5 text-xs leading-relaxed text-[#24282B] sm:text-sm">
          <strong className="font-semibold text-[#1B3D5F]">
            Rule of thumb:{' '}
          </strong>
          <span className="font-serif italic">{note.takeaway}</span>
        </div>
      )}
    </aside>
  );
};
