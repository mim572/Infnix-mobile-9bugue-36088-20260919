import { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, RefreshCw, ToggleLeft, ToggleRight, AlertCircle, CheckCircle, Info, Zap, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

const TYPE_CONFIG = {
  info:    { label: 'Info',    icon: Info,         color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30',   badge: 'bg-blue-500/20 text-blue-400' },
  success: { label: 'Success', icon: CheckCircle,  color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30', badge: 'bg-green-500/20 text-green-400' },
  warning: { label: 'Warning', icon: AlertCircle,  color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', badge: 'bg-yellow-500/20 text-yellow-400' },
  urgent:  { label: 'Urgent',  icon: Zap,          color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30',     badge: 'bg-red-500/20 text-red-400' },
};

export default function BroadcastTab() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<Broadcast['type']>('info');
  const [expiresHours, setExpiresHours] = useState('24');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); }
    else setBroadcasts((data || []) as Broadcast[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) { toast.error('Title and message are required.'); return; }
    setSubmitting(true);

    const expiresAt = expiresHours
      ? new Date(Date.now() + parseInt(expiresHours) * 60 * 60 * 1000).toISOString()
      : null;

    const { error } = await supabase
      .from('broadcasts')
      .insert({ title: title.trim(), message: message.trim(), type, is_active: true, expires_at: expiresAt });

    if (error) { toast.error('Failed to send broadcast.'); }
    else {
      toast.success('Broadcast sent to all users!');
      setTitle(''); setMessage(''); setType('info'); setExpiresHours('24');
      setShowForm(false);
      await load();
    }
    setSubmitting(false);
  };

  const handleToggle = async (b: Broadcast) => {
    setTogglingId(b.id);
    const { error } = await supabase.from('broadcasts').update({ is_active: !b.is_active }).eq('id', b.id);
    if (error) { toast.error('Toggle failed.'); }
    else {
      setBroadcasts(prev => prev.map(x => x.id === b.id ? { ...x, is_active: !b.is_active } : x));
      toast.success(b.is_active ? 'Broadcast hidden from users.' : 'Broadcast shown to users.');
    }
    setTogglingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this broadcast permanently?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('broadcasts').delete().eq('id', id);
    if (error) { toast.error('Delete failed.'); }
    else { toast.success('Broadcast deleted.'); setBroadcasts(prev => prev.filter(b => b.id !== id)); }
    setDeletingId(null);
  };

  const activeCount = broadcasts.filter(b => b.is_active).length;
  const totalCount = broadcasts.length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{totalCount}</p>
          <p className="text-muted-foreground text-xs mt-1">Total</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
          <p className="text-muted-foreground text-xs mt-1">Live Now</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{totalCount - activeCount}</p>
          <p className="text-muted-foreground text-xs mt-1">Hidden</p>
        </div>
      </div>

      {/* Send New Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm transition-colors"
      >
        <Plus className="w-4 h-4" />
        {showForm ? 'Cancel' : 'Send New Broadcast'}
      </button>

      {/* Compose Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-accent" /> Compose Broadcast
          </h3>

          {/* Type Selection */}
          <div>
            <label className="text-muted-foreground text-xs mb-2 block">Message Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TYPE_CONFIG) as [Broadcast['type'], typeof TYPE_CONFIG.info][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setType(key)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                    type === key ? 'border-accent bg-accent/10 text-white' : 'border-border bg-secondary text-muted-foreground'
                  }`}
                >
                  <cfg.icon className={`w-4 h-4 ${type === key ? cfg.color : ''}`} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-muted-foreground text-xs mb-1.5 block">Title <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Platform Maintenance Notice"
              maxLength={80}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-muted-foreground text-xs mb-1.5 block">Message <span className="text-red-400">*</span></label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your message to all platform users..."
              rows={4}
              maxLength={500}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
            />
            <p className="text-muted-foreground text-xs mt-1 text-right">{message.length}/500</p>
          </div>

          {/* Expires */}
          <div>
            <label className="text-muted-foreground text-xs mb-1.5 block">Auto-hide after</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '6h', val: '6' },
                { label: '24h', val: '24' },
                { label: '3 days', val: '72' },
                { label: 'Never', val: '' },
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setExpiresHours(opt.val)}
                  className={`py-2 rounded-xl border text-xs font-medium transition-all ${
                    expiresHours === opt.val ? 'border-accent bg-accent/10 text-white' : 'border-border bg-secondary text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {title && message && (
            <div className={`border rounded-xl p-4 ${TYPE_CONFIG[type].bg}`}>
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Preview</p>
              <div className="flex items-start gap-2">
                {(() => { const Ic = TYPE_CONFIG[type].icon; return <Ic className={`w-4 h-4 ${TYPE_CONFIG[type].color} shrink-0 mt-0.5`} />; })()}
                <div>
                  <p className={`font-bold text-sm ${TYPE_CONFIG[type].color}`}>{title}</p>
                  <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{message}</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-primary to-accent text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Megaphone className="w-4 h-4" />
            {submitting ? 'Sending...' : 'Send Broadcast to All Users'}
          </button>
        </div>
      )}

      {/* Refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">All Broadcasts</h3>
        <button onClick={load} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Broadcasts List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="text-center py-10">
          <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No broadcasts yet</p>
          <p className="text-muted-foreground text-xs mt-1">Create one to notify all users</p>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map(b => {
            const cfg = TYPE_CONFIG[b.type];
            const Icon = cfg.icon;
            const isExpired = b.expires_at && new Date(b.expires_at) < new Date();

            return (
              <div key={b.id} className={`bg-card border rounded-xl p-4 ${!b.is_active || isExpired ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.badge}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-white font-bold text-sm">{b.title}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        {b.is_active && !isExpired && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">
                            LIVE
                          </span>
                        )}
                        {isExpired && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                            EXPIRED
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">{b.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground text-[10px]">
                            {new Date(b.created_at).toLocaleDateString('en-UG', { day: '2-digit', month: 'short' })}
                            {' · '}
                            {new Date(b.created_at).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {b.expires_at && (
                          <span className="text-muted-foreground text-[10px]">
                            Expires: {new Date(b.expires_at).toLocaleDateString('en-UG', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(b)}
                    disabled={togglingId === b.id}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      b.is_active
                        ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                        : 'bg-secondary text-muted-foreground hover:text-white'
                    }`}
                  >
                    {b.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    {togglingId === b.id ? '...' : b.is_active ? 'Visible' : 'Hidden'}
                  </button>

                  <div className="flex-1" />

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(b.id)}
                    disabled={deletingId === b.id}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1.5 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deletingId === b.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
