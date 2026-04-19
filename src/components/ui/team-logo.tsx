'use client';

import { useState } from 'react';
import { getTeamLogoUrl } from '@/data/team-logos';

interface TeamLogoProps {
  teamId: string;
  teamName: string;
  shortName?: string;
  colors?: { primary: string; secondary: string };
  size?: number;
  className?: string;
}

export function TeamLogo({ teamId, teamName, shortName, colors, size = 32, className = '' }: TeamLogoProps) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getTeamLogoUrl(teamId);

  if (!logoUrl || imgError) {
    // Fallback: farbiger Kreis mit Kürzel
    const initials = shortName || teamName.slice(0, 3).toUpperCase();
    const bg = colors?.primary ?? '#6b7280';
    const fg = colors?.secondary ?? '#ffffff';
    const fontSize = Math.max(8, Math.round(size * 0.35));

    return (
      <div
        className={`inline-flex items-center justify-center rounded-full shrink-0 font-bold ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: bg,
          color: fg,
          fontSize,
          lineHeight: 1,
          border: `2px solid ${fg}33`,
        }}
        title={teamName}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={teamName}
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
      onError={() => setImgError(true)}
      loading="lazy"
      title={teamName}
    />
  );
}
