import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Trash2, RefreshCw } from 'lucide-react';
import { getPackages, approvePackage, rejectPackage, deletePackage } from '@/lib/adminData';
import type { Package } from '@/types/admin';
import { toast } from 'sonner';

export default function PaymentsTab() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const data = await getPackages('pending');
    setPackages(data);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleApprove = async (id: string) => {
    await approvePackage(id);
    toast.success('Package approved! Daily income started.');
    refresh();
  };

  const handleReject = async (id: string) => {
    await rejectPackage(id);
    toast.error('Package rejected.');
    refresh();
  };

  const handleDelete = async (id: string) => {
    await deletePackage(id);
    toast.success('Package deleted.');
    refresh();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Pending Payments</h2>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 border border-accent text-accent rounded-xl text-sm hover:bg-accent/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {packages.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No pending payments</p>
        </div>
      ) : (
        <div className="space-y-4">
          {packages.map(pkg => (
            <div key={pkg.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-white text-lg">{pkg.user_name}</h3>
                  <p className="text-muted-foreground text-sm">{pkg.product_name} — {pkg.amount.toLocaleString()} UGX</p>
                </div>
                <span className="bg-yellow-500/20 text-yellow-400 text-xs font-semibold px-3 py-1 rounded-full border border-yellow-500/30">
                  Pending
                </span>
              </div>

              <div className="bg-secondary rounded-xl p-3 mb-3">
                <p className="text-muted-foreground text-xs mb-1">Payment Method</p>
                <p className="font-bold text-white flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                  {pkg.payment_network === 'Wallet' ? 'Paid from Wallet Balance' : `${pkg.payment_network}: ${pkg.payment_number}`}
                </p>
                {pkg.payment_proof && (
                  <p className="text-muted-foreground text-xs mt-1">{pkg.payment_proof}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
                <div><span className="text-foreground font-medium">Group:</span> {pkg.product_group}</div>
                <div><span className="text-foreground font-medium">Duration:</span> {pkg.duration_days} days</div>
                <div><span className="text-foreground font-medium">Daily:</span> {pkg.daily_income.toLocaleString()} UGX</div>
                <div><span className="text-foreground font-medium">User Phone:</span> {pkg.user_phone}</div>
              </div>

              <p className="text-muted-foreground text-xs mb-4">
                Submitted: {new Date(pkg.submitted_at).toLocaleString()}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(pkg.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => handleReject(pkg.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors"
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
