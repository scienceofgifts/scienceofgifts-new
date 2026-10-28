import React from 'react';
import {
  GiftThinkingActionType,
  ThinkingStatusDescriptor,
} from '../utils/giftFinderThinking';

export interface GiftThinkingAnimationProps {
  actionType: GiftThinkingActionType;
  phase: 1 | 2;
  statusMessage: string;
  descriptor: ThinkingStatusDescriptor;
  prefersReducedMotion?: boolean;
}

/**
 * Custom SVG illustration of a ribboned editorial gift box with floating gift tags
 * and matching cards — "a little gift-finding engine at work".
 * When `prefersReducedMotion` is true, all motion transforms are disabled and a calm
 * static composition is rendered.
 */
const EditorialGiftEngineIllustration: React.FC<{
  variant: 'quiz' | 'search' | 'compact';
  phase: 1 | 2;
  prefersReducedMotion: boolean;
}> = ({ variant, phase, prefersReducedMotion }) => {
  if (variant === 'compact') {
    return (
      <div
        aria-hidden="true"
        className="relative w-10 h-10 rounded-2xl bg-[#E8F8F0] border border-[#1B3D5F]/12 flex items-center justify-center shrink-0 overflow-hidden"
      >
        <svg
          viewBox="0 0 40 40"
          className="w-6 h-6 text-[#1B3D5F]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Gift Lid */}
          <g
            className={
              prefersReducedMotion
                ? ''
                : 'origin-center transition-transform duration-300 ease-out -translate-y-0.5'
            }
          >
            <rect
              x="7"
              y="12"
              width="26"
              height="6"
              rx="2"
              fill="#FAF7F2"
              stroke="#1B3D5F"
              strokeWidth="1.75"
            />
            <path
              d="M20 12C20 12 16.5 7 13.5 8.5C11 9.8 13.5 12 20 12Z"
              fill="#F2846B"
              stroke="#1B3D5F"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M20 12C20 12 23.5 7 26.5 8.5C29 9.8 26.5 12 20 12Z"
              fill="#F2846B"
              stroke="#1B3D5F"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </g>
          {/* Gift Box Base */}
          <rect
            x="9"
            y="18"
            width="22"
            height="15"
            rx="2.5"
            fill="#FAF7F2"
            stroke="#1B3D5F"
            strokeWidth="1.75"
          />
          {/* Vertical Ribbon */}
          <rect x="18.25" y="12" width="3.5" height="21" fill="#F2846B" />
          {/* Small Sparkle Accent */}
          <circle
            cx="32"
            cy="9"
            r="2"
            fill="#28537D"
            className={prefersReducedMotion ? '' : 'animate-pulse'}
          />
        </svg>
      </div>
    );
  }

  const isQuiz = variant === 'quiz';

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-44 h-32 flex items-center justify-center select-none"
    >
      {/* Soft Halo Backdrop */}
      <div
        className={`absolute inset-2 rounded-3xl ${
          isQuiz ? 'bg-[#E8F8F0]/90' : 'bg-[#F3ECE1]/90'
        } border border-[#1B3D5F]/10`}
      />

      {/* Left Floating Gift Tag / Recommendation Card */}
      <div
        className={`absolute left-2 top-4 w-14 h-10 rounded-xl bg-white border border-[#1B3D5F]/15 shadow-2xs p-1.5 flex flex-col justify-between ${
          prefersReducedMotion
            ? '-rotate-6'
            : 'transition-all duration-500 ease-in-out -rotate-6 animate-pulse'
        }`}
      >
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F2846B]" />
          <span className="h-1.5 w-7 rounded-full bg-[#1B3D5F]/20" />
        </div>
        <div className="space-y-1">
          <div className="h-1 w-9 rounded-full bg-[#28537D]/25" />
          <div className="h-1 w-6 rounded-full bg-[#C3F3DF]" />
        </div>
      </div>

      {/* Right Floating Gift Tag / Match Card */}
      <div
        className={`absolute right-2 top-5 w-14 h-10 rounded-xl bg-white border border-[#1B3D5F]/15 shadow-2xs p-1.5 flex flex-col justify-between ${
          prefersReducedMotion
            ? 'rotate-6'
            : 'transition-all duration-500 ease-in-out rotate-6 animate-pulse'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="h-1.5 w-6 rounded-full bg-[#1B3D5F]/20" />
          <span className="w-2 h-2 rounded-full bg-[#C3F3DF] border border-[#1B3D5F]/30" />
        </div>
        <div className="space-y-1">
          <div className="h-1 w-8 rounded-full bg-[#28537D]/25" />
          <div className="h-1 w-5 rounded-full bg-[#F2846B]/40" />
        </div>
      </div>

      {/* Central Illustrated Gift Box */}
      <svg
        viewBox="0 0 120 100"
        className="relative z-10 w-28 h-24 overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Subtle Shadow Under Box */}
        <ellipse
          cx="60"
          cy="86"
          rx="30"
          ry="4.5"
          fill="#1B3D5F"
          fillOpacity="0.1"
        />

        {/* Emerging Gift Note Card from Inside the Box */}
        <g
          className={
            prefersReducedMotion
              ? ''
              : phase === 2
                ? 'transition-transform duration-500 -translate-y-2.5'
                : 'transition-transform duration-500 -translate-y-1'
          }
        >
          <rect
            x="43"
            y="26"
            width="34"
            height="22"
            rx="3"
            fill="#FFFFFF"
            stroke="#1B3D5F"
            strokeWidth="1.75"
          />
          <line
            x1="49"
            y1="33"
            x2="69"
            y2="33"
            stroke="#28537D"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <line
            x1="49"
            y1="38"
            x2="63"
            y2="38"
            stroke="#F2846B"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </g>

        {/* Gift Box Lid (gently lifted while matching) */}
        <g
          className={
            prefersReducedMotion
              ? ''
              : phase === 2
                ? 'transition-transform duration-500 -translate-y-3 rotate-[-2deg]'
                : 'transition-transform duration-500 -translate-y-1.5 rotate-[1deg]'
          }
        >
          {/* Ribbon Bow Loops */}
          <path
            d="M60 28C60 28 49 16 42 20C36 23.2 43 29 60 28Z"
            fill="#F2846B"
            stroke="#1B3D5F"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M60 28C60 28 71 16 78 20C84 23.2 77 29 60 28Z"
            fill="#F2846B"
            stroke="#1B3D5F"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Lid Body */}
          <rect
            x="30"
            y="28"
            width="60"
            height="12"
            rx="3.5"
            fill="#FAF7F2"
            stroke="#1B3D5F"
            strokeWidth="2"
          />
          {/* Lid Center Ribbon Band */}
          <rect
            x="55"
            y="28"
            width="10"
            height="12"
            fill="#F2846B"
            stroke="#1B3D5F"
            strokeWidth="1.75"
          />
        </g>

        {/* Gift Box Base */}
        <rect
          x="34"
          y="42"
          width="52"
          height="40"
          rx="4.5"
          fill="#FAF7F2"
          stroke="#1B3D5F"
          strokeWidth="2"
        />

        {/* Soft Mint Accent Stripe Inside Box Base */}
        <rect
          x="36"
          y="44"
          width="48"
          height="7"
          fill="#C3F3DF"
          fillOpacity="0.65"
        />

        {/* Vertical Coral Ribbon on Base */}
        <rect
          x="55"
          y="42"
          width="10"
          height="40"
          fill="#F2846B"
          stroke="#1B3D5F"
          strokeWidth="1.75"
        />

        {/* Attached Luggage-Style Gift Tag on Right */}
        <g
          className={
            prefersReducedMotion
              ? ''
              : 'origin-[78px_46px] transition-transform duration-500 rotate-6'
          }
        >
          <path
            d="M65 42C71 42 75 45 78 48"
            stroke="#1B3D5F"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <rect
            x="74"
            y="46"
            width="18"
            height="11"
            rx="2.5"
            transform="rotate(14 74 46)"
            fill="#E8F8F0"
            stroke="#1B3D5F"
            strokeWidth="1.5"
          />
          <circle cx="77.5" cy="50.5" r="1.2" fill="#1B3D5F" />
        </g>

        {/* Subtle Editorial Stars / Matching Cues */}
        <path
          d="M22 24L23.5 27.5L27 29L23.5 30.5L22 34L20.5 30.5L17 29L20.5 27.5L22 24Z"
          fill="#28537D"
          className={prefersReducedMotion ? '' : 'animate-pulse'}
        />
        <path
          d="M98 20L99.2 22.8L102 24L99.2 25.2L98 28L96.8 25.2L94 24L96.8 22.8L98 20Z"
          fill="#F2846B"
          className={prefersReducedMotion ? '' : 'animate-pulse'}
        />
      </svg>
    </div>
  );
};

/**
 * Gift-themed thinking experience for the Science of Gifts Finder.
 * Renders an action-appropriate editorial transition:
 * - 'quiz': Full gift-matching & discovery card showing the 5 recipient/interest/occasion/budget/style tags
 * - 'search': Focused gift-matching card in the results area showing query & criteria matching
 * - 'filter' | 'sort': Lightweight inline transition banner keeping filter controls responsive
 */
export const GiftThinkingAnimation: React.FC<GiftThinkingAnimationProps> = ({
  actionType,
  phase,
  statusMessage,
  descriptor,
  prefersReducedMotion = false,
}) => {
  const isCompact = actionType === 'filter' || actionType === 'sort';

  if (isCompact) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid={`gift-thinking-${actionType}`}
        data-thinking-action={actionType}
        data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
        className="p-4 sm:px-5 sm:py-4 rounded-2xl bg-[#E8F8F0]/90 border border-[#1B3D5F]/12 flex flex-wrap items-center justify-between gap-4 shadow-2xs transition-opacity duration-200"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <EditorialGiftEngineIllustration
            variant="compact"
            phase={phase}
            prefersReducedMotion={prefersReducedMotion}
          />
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#28537D]">
              {descriptor.headline}
            </div>
            <p className="text-sm font-serif font-semibold text-[#1B3D5F] truncate">
              {statusMessage}
            </p>
          </div>
        </div>

        {descriptor.contextChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {descriptor.contextChips.map((chip) => (
              <span
                key={chip.id}
                className="px-2.5 py-1 rounded-full bg-white/90 border border-[#1B3D5F]/10 text-[11px] font-medium text-[#1B3D5F]"
              >
                <span className="text-[#28537D]">{chip.label}:</span>{' '}
                <strong className="font-semibold">{chip.value}</strong>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  const isQuiz = actionType === 'quiz';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid={`gift-thinking-${actionType}`}
      data-thinking-action={actionType}
      data-thinking-phase={phase}
      data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
      className={`p-7 sm:p-10 rounded-3xl border text-center space-y-6 shadow-xs transition-all duration-300 ${
        isQuiz
          ? 'bg-[#E8F8F0]/65 border-[#1B3D5F]/15'
          : 'bg-[#F3ECE1]/85 border-[#1B3D5F]/10'
      }`}
    >
      {/* Gift-Finding Engine Illustration */}
      <EditorialGiftEngineIllustration
        variant={isQuiz ? 'quiz' : 'search'}
        phase={phase}
        prefersReducedMotion={prefersReducedMotion}
      />

      {/* Editorial Status Copy */}
      <div className="max-w-xl mx-auto space-y-2">
        <div className="text-xs font-semibold uppercase tracking-widest text-[#28537D]">
          {isQuiz
            ? 'Guided Gift Matcher · Curating Shortlist'
            : 'Gift Finder · Matching Catalog'}
        </div>

        <h3 className="text-2xl sm:text-3xl font-serif font-semibold text-[#1B3D5F] leading-tight">
          {descriptor.headline}
        </h3>

        <p
          data-testid="gift-thinking-status-message"
          className="text-sm sm:text-base font-medium text-[#1B3D5F]"
        >
          {statusMessage}
        </p>

        <p className="text-xs sm:text-sm text-[#28537D] leading-relaxed">
          {descriptor.subheadline}
        </p>
      </div>

      {/* Tactile Gift Tag Signals Being Matched */}
      {descriptor.contextChips.length > 0 && (
        <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5 max-w-2xl mx-auto">
          {descriptor.contextChips.map((chip, idx) => (
            <div
              key={chip.id}
              className={`px-3.5 py-2 rounded-2xl bg-white border border-[#1B3D5F]/12 shadow-2xs inline-flex items-center gap-2 text-xs ${
                prefersReducedMotion
                  ? ''
                  : idx % 2 === 0
                    ? 'transition-transform duration-300 hover:-translate-y-0.5'
                    : 'transition-transform duration-300'
              }`}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full bg-[#F2846B] shrink-0"
              />
              <span className="text-[#28537D] font-medium">{chip.label}:</span>
              <strong className="font-semibold text-[#1B3D5F]">
                {chip.value}
              </strong>
            </div>
          ))}
        </div>
      )}

      {/* Subtle Two-Step Editorial Progress Indicator (non-numeric, no fake percentages) */}
      <div
        aria-hidden="true"
        className="flex items-center justify-center gap-2 pt-1"
      >
        <span
          className={`h-1.5 rounded-full transition-all duration-300 ${
            phase === 1
              ? 'w-8 bg-[#1B3D5F]'
              : 'w-4 bg-[#1B3D5F]/40'
          }`}
        />
        <span
          className={`h-1.5 rounded-full transition-all duration-300 ${
            phase === 2
              ? 'w-8 bg-[#1B3D5F]'
              : 'w-4 bg-[#1B3D5F]/25'
          }`}
        />
      </div>
    </div>
  );
};
