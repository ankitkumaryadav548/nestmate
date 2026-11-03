'use client';

import React from 'react';
import Avatar from './Avatar';
import { IconUser, IconBed, IconShield } from './Icons';

/**
 * SeatTile
 * Visualizes a group seat:
 * - Filled: Member avatar, name, year/dept, crown icon if leader
 * - Empty: Dashed border with soft pulse, "Open Seat" label
 * - Reserved: Lock / bed icon for claim-locked seats when group has a room
 */
export default function SeatTile({
  seatNumber = 1,
  member = null,
  isLeader = false,
  isReserved = false,
  isCurrentUser = false,
  onInvite,
  className = '',
}) {
  if (member) {
    const displayName = member.name || member.fullName || 'Member';
    const subtext = [
      member.academic?.branch || member.branch || member.department,
      member.academic?.year ? `Year ${member.academic.year}` : (member.year ? `Year ${member.year}` : null),
    ].filter(Boolean).join(' • ');

    return (
      <div
        className={`relative group flex flex-col items-center text-center p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
          isCurrentUser
            ? 'border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/20'
            : 'border-slate-200/90 dark:border-slate-800'
        } ${className}`}
      >
        {/* Crown for Leader with pop-in effect */}
        {isLeader && (
          <div
            title="Group Leader"
            className="absolute -top-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 animate-scale-in"
          >
            <span>👑</span> Leader
          </div>
        )}

        {/* Current User Pill */}
        {isCurrentUser && (
          <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md">
            You
          </span>
        )}

        <div className="mt-2 relative">
          <Avatar name={displayName} size="lg" className="ring-2 ring-white dark:ring-slate-900 shadow-sm" />
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center">
            #{seatNumber}
          </span>
        </div>

        <h4 className="mt-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 font-heading truncate max-w-[140px]">
          {displayName}
        </h4>
        {subtext && (
          <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[140px] mt-0.5">
            {subtext}
          </p>
        )}
      </div>
    );
  }

  if (isReserved) {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center p-4 rounded-2xl border border-dashed border-amber-300/80 dark:border-amber-700/60 bg-amber-50/40 dark:bg-amber-950/20 transition-all ${className}`}
      >
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg mb-2 shadow-inner">
          <IconBed className="w-5 h-5" />
        </div>
        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
          Seat #{seatNumber} Reserved
        </span>
        <span className="text-[11px] text-amber-700 dark:text-amber-400/80 mt-0.5">
          Locked by Room Claim
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onInvite}
      className={`flex flex-col items-center justify-center text-center p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 transition-all duration-200 ${
        onInvite ? 'cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 group' : ''
      } ${className}`}
    >
      <div className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-300 dark:group-hover:border-indigo-700 flex items-center justify-center transition-colors mb-2">
        <IconUser className="w-5 h-5" />
      </div>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        Seat #{seatNumber}
      </span>
      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
        {onInvite ? '+ Invite roommate' : 'Open seat'}
      </span>
    </div>
  );
}

