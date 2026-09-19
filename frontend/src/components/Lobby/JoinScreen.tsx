import { useState, useId } from 'react';
import { api } from '../../services/api';
import { sound } from '../../services/sound';
import type { Player } from '../../types/player';

interface JoinScreenProps {
  onJoined: (player: Player) => void;
}

export function JoinScreen({ onJoined }: JoinScreenProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usernameInputId = useId();

  // Controlled tactical preview color based on current typed name
  const previewColors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#14B8A6'];
  const previewColor = username.length > 0
    ? previewColors[Math.abs(username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % previewColors.length]
    : '#6366F1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();

    if (cleanUsername.length < 2 || cleanUsername.length > 30) {
      setError('Call-sign must be between 2 and 30 characters');
      sound.playError();
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setError('Only letters, numbers, underscores, hyphens, and periods allowed');
      sound.playError();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const player = await api.createPlayer(cleanUsername);
      sound.playClaimSuccess();
      onJoined(player);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join game';
      setError(msg);
      sound.playError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-grid-bg flex items-center justify-center p-4 overflow-hidden tactical-scanline">
      {/* Background ambient grid graphics */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1b1c31_1px,transparent_1px),linear-gradient(to_bottom,#1b1c31_1px,transparent_1px)] bg-[size:40px_40px] opacity-35" />

      {/* Center glowing focal point */}
      <div 
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: previewColor }}
      />

      <div className="relative z-10 w-full max-w-md bg-surface/90 border border-grid-line/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl glow-accent">
        {/* Terminal Header */}
        <div className="flex items-center justify-between pb-6 border-b border-grid-line/60 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-widest text-text-muted">GRID NETWORK ONLINE</span>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-elevated text-accent border border-accent/20">
            50 × 50 SECTORS
          </span>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary">
            CLAIM<span className="text-accent" style={{ color: previewColor }}>GRID</span>
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Real-Time Authoritative Territory War
          </p>
        </div>

        {/* Tactical Rules Briefing */}
        <div className="bg-surface-elevated/70 border border-grid-line/50 rounded-xl p-4 mb-6 space-y-2 text-xs font-mono text-text-secondary">
          <div className="flex items-center gap-2 text-text-primary font-semibold uppercase tracking-wider">
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Deployment Briefing
          </div>
          <p>• Every cell is unowned neutral territory.</p>
          <p>• Server assigns your verified faction color.</p>
          <p>• Atomic concurrent claims with real-time 3s cooldown.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor={usernameInputId} className="block text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
                Commander Call-sign
              </label>
              <span className="text-xs font-mono text-text-muted">{username.length}/30</span>
            </div>

            <div className="relative">
              <input
                id={usernameInputId}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Nova_9"
                disabled={loading}
                autoFocus
                maxLength={30}
                className="w-full px-4 py-3 bg-surface-elevated border border-grid-line rounded-xl text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono text-sm transition-all"
              />
              {username.length >= 2 && (
                <div 
                  className="absolute right-3 top-3 w-5 h-5 rounded-full border-2 border-surface shadow-sm transition-transform duration-300 transform scale-110"
                  style={{ backgroundColor: previewColor }}
                  title="Allocated faction color preview"
                />
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs font-mono flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || username.trim().length < 2}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wider uppercase bg-accent hover:bg-accent-glow text-white shadow-lg hover:shadow-accent/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
            style={{ backgroundColor: username.trim().length >= 2 ? previewColor : undefined }}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Deploying to Sector...
              </>
            ) : (
              <>
                Enter the Grid
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-grid-line/40 text-center">
          <p className="text-[11px] font-mono text-text-muted">
            PostgreSQL Authoritative • Spring WebSocket Live • 2,500 Cells
          </p>
        </div>
      </div>
    </div>
  );
}
