/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SocietalNews } from '../types';
import { AlertCircle, Radio, Newspaper, ShieldAlert, TrendingDown, Users, X } from 'lucide-react';

interface SocietalNewsTickerProps {
  news: SocietalNews | null;
  onDismiss: () => void;
}

export const SocietalNewsTicker: React.FC<SocietalNewsTickerProps> = ({ news, onDismiss }) => {
  if (!news) return null;

  const categoryMeta = {
    CULT: {
      label: '이단 발흥 경보',
      color: 'bg-purple-950/90 border-purple-500/60 text-purple-200',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      icon: ShieldAlert,
    },
    ECONOMY: {
      label: '경제·실업 한파',
      color: 'bg-rose-950/90 border-rose-500/60 text-rose-200',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: TrendingDown,
    },
    POLITICS: {
      label: '사회·정치 분열',
      color: 'bg-amber-950/90 border-amber-500/60 text-amber-200',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: Users,
    },
    SECULARISM: {
      label: '세속주의 침체',
      color: 'bg-cyan-950/90 border-cyan-500/60 text-cyan-200',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      icon: AlertCircle,
    },
  }[news.category] || {
    label: '시대의 징후',
    color: 'bg-slate-900/90 border-white/20 text-white',
    badge: 'bg-white/10 text-white border-white/20',
    icon: Newspaper,
  };

  const Icon = categoryMeta.icon;
  const secondsLeft = Math.ceil(news.duration);

  return (
    <div
      id="societal-news-ticker"
      className="absolute top-14 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-3xl pointer-events-auto animate-in slide-in-from-top-4 duration-300"
    >
      <div
        className={`flex items-start sm:items-center justify-between gap-3 p-3 rounded-md border backdrop-blur-md shadow-2xl ${categoryMeta.color}`}
      >
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative flex items-center justify-center p-1.5 rounded-full bg-white/10">
            <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold uppercase tracking-wider border ${categoryMeta.badge}`}
            >
              <Icon className="w-3 h-3" />
              {categoryMeta.label}
            </span>
            <span className="text-[10px] font-mono text-white/50">
              {news.severity === 'HIGH' ? '🔴 긴급 경보' : '🟡 예고 관측'} · {secondsLeft}초
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-2">
          <h4 className="text-xs sm:text-sm font-bold tracking-tight text-white line-clamp-1">
            {news.headline}
          </h4>
          <p className="text-[11px] text-white/80 line-clamp-1 mt-0.5 font-sans">
            {news.impactDescription}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="shrink-0 text-white/40 hover:text-white/90 p-1 rounded-sm transition-colors cursor-pointer"
          title="알림 닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
