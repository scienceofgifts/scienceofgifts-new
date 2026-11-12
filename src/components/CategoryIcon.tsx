import React from 'react';
import {
  Baby,
  BookOpen,
  Brain,
  BrainCircuit,
  Cake,
  ClipboardCheck,
  Coffee,
  Compass,
  Dice5,
  Flame,
  Gift,
  GraduationCap,
  Handshake,
  Heart,
  HeartHandshake,
  Home,
  Lamp,
  Landmark,
  Sparkles,
  Sprout,
  Sunrise,
  UserRound,
  Users,
  Utensils,
  Wallet,
  Wine,
} from 'lucide-react';
import {
  CategoryIconKey,
  resolveCategoryIconKey,
} from '../config/navigationConfig';

const ICON_COMPONENTS: Record<
  CategoryIconKey,
  React.ComponentType<{
    className?: string;
    strokeWidth?: number;
    'aria-hidden'?: boolean | 'true' | 'false';
  }>
> = {
  brain: Brain,
  'heart-handshake': HeartHandshake,
  'brain-circuit': BrainCircuit,
  handshake: Handshake,
  'clipboard-check': ClipboardCheck,
  landmark: Landmark,
  users: Users,
  heart: Heart,
  'user-round': UserRound,
  utensils: Utensils,
  'graduation-cap': GraduationCap,
  baby: Baby,
  coffee: Coffee,
  lamp: Lamp,
  flame: Flame,
  sunrise: Sunrise,
  wine: Wine,
  'book-open': BookOpen,
  sprout: Sprout,
  'dice-5': Dice5,
  cake: Cake,
  home: Home,
  sparkles: Sparkles,
  gift: Gift,
  wallet: Wallet,
  compass: Compass,
};

export interface CategoryIconProps {
  iconKey?: CategoryIconKey;
  dimension?: 'topic' | 'recipient' | 'interest' | 'occasion' | 'budget';
  categoryKey?: string;
  sizeClass?: string;
  className?: string;
  withSurfaceBadge?: boolean;
}

/**
 * Refined outline category icon (24–28px default) using the centralized
 * Science of Gifts taxonomy icon registry. Always hidden from screen readers
 * when paired with visible category headings.
 */
export const CategoryIcon: React.FC<CategoryIconProps> = ({
  iconKey,
  dimension,
  categoryKey,
  sizeClass = 'h-6 w-6',
  className = 'text-[#1B3D5F]',
  withSurfaceBadge = true,
}) => {
  const resolvedKey: CategoryIconKey =
    iconKey ??
    (dimension && categoryKey
      ? resolveCategoryIconKey(dimension, categoryKey)
      : 'compass');

  const IconComponent = ICON_COMPONENTS[resolvedKey] ?? Compass;

  if (!withSurfaceBadge) {
    return (
      <IconComponent
        aria-hidden="true"
        strokeWidth={1.75}
        className={`shrink-0 ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E3E1DB] bg-[#FAF9F6] text-[#1B3D5F]"
    >
      <IconComponent
        aria-hidden="true"
        strokeWidth={1.75}
        className={`shrink-0 ${sizeClass} ${className}`}
      />
    </span>
  );
};
