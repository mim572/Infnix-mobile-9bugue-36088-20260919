import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Trash2, RefreshCw, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { getRecharges, approveRecharge, rejectRecharge, deleteRecharge } from '@/lib/adminData';
import type { Package } from '@/types/admin';
import { toast } from 'sonner';

export default function RechargesTab() {
  const [recharges, setRecharges] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProof, setExpandedProof] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const refresh = async () => {
    setLoading(true);
    const data = await getRecharges(filter === 'pending' ? 'pending' : undefined);
    setRecharges(data);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [filter]);

  const handleApprove = async (id: string) => {
    await approveRecharge(id);
    toast.success('Recharge approved — wallet credited!');
    refresh();
  };

  const handleReject = async (id: string) => {
    await rejectRecharge(id);
    toast.error('Recharge rejected.');
    refresh();
  };

  const handleDelete = async (id: string) => {
    await deleteRecharge(id);
    toast.success('Recharge record deleted.');
    refresh();
  };

  const parseProof = (proof: string | undefined) => {
    if (!proof) return null;
    // Format: "Name: X | Phone: Y | Proof: Z"
    const parts: Record<string, string> = {};
    proof.split(' | ').forEach(part => {
      const [key, ...val] = part.split(': ');
      if (key && val.length) parts[key.trim()] = val.join(': ').trim();
    });
    return parts;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-lg font-bold text-white">Recharge Requests</h2>
        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <div className="flex bg-secondary rounded-xl overflow-hidden border border-border">
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${filter === 'pending' ? 'bg-accent text-white' : 'text-muted-foreground'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${filter === 'all' ? 'bg-accent text-white' : 'text-muted-foreground'}`}
            >
              All
            </button>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-4 py-2 border border-accent text-accent rounded-xl text-sm hover:bg-accent/10 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : recharges.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No {filter === 'pending' ? 'pending' : ''} recharge requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recharges.map(pkg => {
            const proofData = parseProof(pkg.payment_proof);
            const isExpanded = expandedProof === pkg.id;

            return (
              <div key={pkg.id} className="bg-card border border-border rounded-2xl p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white text-base">{pkg.user_name}</h3>
                    <p className="text-muted-foreground text-sm">{pkg.user_phone}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                    pkg.status === 'pending'
                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      : pkg.status === 'active'
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}>
                    {pkg.status === 'active' ? 'Approved' : pkg.status.charAt(0).toUpperCase() + pkg.status.slice(1)}
                  </span>
                </div>

                {/* Amount + Network */}
                <div className="bg-secondary rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Recharge Amount</p>
                      <p className="text-white font-bold text-xl">{pkg.amount.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">UGX</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs mb-0.5">Network</p>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${pkg.payment_network === 'MTN' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                        <p className="text-white font-semibold text-sm">{pkg.payment_network}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sender phone */}
                {pkg.payment_number && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${pkg.payment_network === 'MTN' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                    <p className="text-muted-foreground text-sm">
                      Sent from: <span className="text-white font-semibold">{pkg.payment_number}</span>
                    </p>
                  </div>
                )}

                {/* Proof expandable */}
                {pkg.payment_proof && (
                  <div className="mb-3">
                    <button
                      onClick={() => setExpandedProof(isExpanded ? null : pkg.id)}
                      className="w-full flex items-center justify-between bg-secondary hover:bg-border rounded-xl px-3 py-2.5 text-sm transition-colors"
                    >
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="w-4 h-4 text-accent" />
                        Payment Proof
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 bg-secondary/60 border border-border rounded-xl p-3 space-y-2">
                        {proofData ? (
                          <>
                            {proofData['Name'] && (
                              <div>
                                <p className="text-muted-foreground text-xs">Sender Name</p>
                                <p className="text-white text-sm font-medium">{proofData['Name']}</p>
                              </div>
                            )}
                            {proofData['Phone'] && (
                              <div>
                                <p className="text-muted-foreground text-xs">Sender Phone</p>
                                <p className="text-white text-sm font-medium">{proofData['Phone']}</p>
                              </div>
                            )}
                            {proofData['Proof'] && (
                              <div>
                                <p className="text-muted-foreground text-xs">SMS Confirmation</p>
                                <p className="text-white text-xs leading-relaxed bg-black/30 rounded-lg p-2 mt-1 font-mono whitespace-pre-wrap">{proofData['Proof']}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-white text-xs leading-relaxed font-mono whitespace-pre-wrap">{pkg.payment_proof}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-muted-foreground text-xs mb-4">
                  Submitted: {new Date(pkg.submitted_at).toLocaleString()}
                </p>

                {/* Actions */}
                {pkg.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(pkg.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve & Credit
                    </button>
                    <button
                      onClick={() => handleReject(pkg.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() => handleDelete(pkg.id)}
                      className="w-12 flex items-center justify-center bg-secondary hover:bg-border text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold ${
                      pkg.status === 'active'
                        ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}>
                      {pkg.status === 'active' ? (
                        <><CheckCircle className="w-4 h-4" /> Approved — Wallet Credited</>
                      ) : (
                        <><XCircle className="w-4 h-4" /> Rejected</>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(pkg.id)}
                      className="w-12 flex items-center justify-center bg-secondary hover:bg-border text-muted-foreground hover:text-foreground rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
