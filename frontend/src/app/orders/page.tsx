'use client';

import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Order {
  id: number;
  total_price: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cancelingOrder, setCancelingOrder] = useState<number | null>(null);

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user && !isLoading) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const loadOrders = async (currentPage: number) => {
    setIsLoading(true);
    try {
      const data = await fetchAPI(`/orders?page=${currentPage}&limit=5`);
      setOrders(data.orders);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadOrders(page);
    }
  }, [user, page]);

  const handleCancel = async (orderId: number) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    setCancelingOrder(orderId);
    setError('');

    try {
      await fetchAPI(`/orders/${orderId}/cancel`, {
        method: 'PATCH',
      });
      // Refresh current page
      await loadOrders(page);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCancelingOrder(null);
    }
  };

  if (!user) return null; // Prevent flicker before redirect

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
            Order History
          </h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base">Manage and track your allocations</p>
        </div>
        <Link
          href="/"
          className="self-start sm:self-center px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-all shadow-md active:scale-95 flex items-center gap-2"
        >
          ← Back to Marketplace
        </Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl backdrop-blur-md text-sm">
          ⚠️ {error}
        </div>
      )}

      {isLoading && orders.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-16 text-center max-w-xl mx-auto shadow-xl">
          <div className="text-5xl mb-4">🛒</div>
          <h3 className="text-xl font-bold text-slate-200 mb-2">No orders found</h3>
          <p className="text-slate-400 text-sm mb-6">You haven't placed any orders yet in our marketplace.</p>
          <Link
            href="/"
            className="inline-flex bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all text-sm"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-900 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-indigo-500/20 transition-all duration-200 shadow-md"
            >
              <div className="space-y-2 w-full md:w-auto">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-extrabold text-white">Order #{order.id}</span>
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-semibold border
                    ${
                      order.status === 'COMPLETED'
                        ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10'
                        : order.status === 'CANCELLED'
                        ? 'bg-rose-500/5 text-rose-400 border-rose-500/10'
                        : 'bg-amber-500/5 text-amber-400 border-amber-500/10'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Placed on {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })} at{' '}
                  {new Date(order.created_at).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                </div>
              </div>

              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t border-slate-900 pt-4 md:border-0 md:pt-0">
                <div className="text-2xl font-black text-indigo-400">
                  ${parseFloat(order.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>

                {order.status !== 'CANCELLED' && (
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={cancelingOrder === order.id}
                    className="text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-600/90 bg-rose-500/5 hover:border-rose-600 border border-rose-500/10 px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
                  >
                    {cancelingOrder === order.id ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin"></div>
                        Canceling...
                      </>
                    ) : (
                      <>
                        <span>✕</span> Cancel Order
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-10 pt-8 border-t border-slate-900">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-35 disabled:hover:bg-slate-900 disabled:hover:border-slate-800 font-semibold text-xs transition-all active:scale-95"
              >
                Previous
              </button>
              <span className="text-slate-400 text-xs font-semibold bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                Page <span className="text-white font-bold">{page}</span> of <span className="text-white font-bold">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-35 disabled:hover:bg-slate-900 disabled:hover:border-slate-800 font-semibold text-xs transition-all active:scale-95"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

