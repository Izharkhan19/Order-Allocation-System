'use client';

import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

interface Product {
  id: number;
  name: string;
  price: string;
  stock: number;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Admin Product Creation States
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [isAdminCreating, setIsAdminCreating] = useState(false);

  // Order Creation Modal States
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderError, setOrderError] = useState('');

  const { user } = useAuth();
  const router = useRouter();

  const loadProducts = async () => {
    try {
      const data = await fetchAPI('/products');
      setProducts(data);
    } catch (err: any) {
      setError('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleOpenOrderModal = (product: Product) => {
    if (!user) {
      router.push('/login');
      return;
    }
    setSelectedProduct(product);
    setOrderQuantity(1);
    setOrderError('');
    setSuccessMsg('');
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (orderQuantity <= 0) {
      setOrderError('Quantity must be at least 1');
      return;
    }
    if (orderQuantity > selectedProduct.stock) {
      setOrderError(`Cannot exceed available stock (${selectedProduct.stock})`);
      return;
    }

    setIsOrdering(true);
    setOrderError('');

    try {
      await fetchAPI('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ product_id: selectedProduct.id, quantity: orderQuantity }],
        }),
      });

      setSuccessMsg(`Successfully ordered ${orderQuantity}x "${selectedProduct.name}"!`);
      setSelectedProduct(null);
      await loadProducts();
      // Auto-clear success message
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setOrderError(err.message);
    } finally {
      setIsOrdering(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!newProductName.trim()) {
      setError('Product name is required');
      return;
    }
    if (parseFloat(newProductPrice) <= 0 || isNaN(parseFloat(newProductPrice))) {
      setError('Price must be a positive number');
      return;
    }
    if (parseInt(newProductStock) < 0 || isNaN(parseInt(newProductStock))) {
      setError('Stock must be a non-negative integer');
      return;
    }

    setIsAdminCreating(true);

    try {
      await fetchAPI('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: newProductName,
          price: parseFloat(newProductPrice),
          stock: parseInt(newProductStock),
        }),
      });

      setSuccessMsg(`Product "${newProductName}" created successfully!`);
      setNewProductName('');
      setNewProductPrice('');
      setNewProductStock('');
      setShowAdminForm(false);
      await loadProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    } finally {
      setIsAdminCreating(false);
    }
  };

  const handleDeleteProduct = async (productId: number, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"?`)) return;
    setError('');
    setSuccessMsg('');

    try {
      await fetchAPI(`/products/${productId}`, {
        method: 'DELETE',
      });
      setSuccessMsg(`Deleted product "${productName}"`);
      await loadProducts();
    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
            Premium Marketplace
          </h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base">Secure and ultra-fast Order Allocation System</p>
        </div>

        {/* Admin trigger button */}
        <button
          onClick={() => {
            setShowAdminForm(!showAdminForm);
            setError('');
          }}
          className="self-start sm:self-center px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-all shadow-md active:scale-95 flex items-center gap-2"
        >
          <span>🛠️</span> {showAdminForm ? 'Close Admin Panel' : 'Admin: Create Product'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl backdrop-blur-md text-sm animate-fade-in">
          ⚠️ {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl backdrop-blur-md text-sm animate-fade-in">
          ✅ {successMsg}
        </div>
      )}

      {/* Admin product creator form */}
      {showAdminForm && (
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-indigo-500/20 shadow-xl max-w-xl mx-auto animate-slide-down">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>📦</span> Seed New Product
          </h2>
          <form onSubmit={handleCreateProduct} className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Product Name</label>
              <input
                type="text"
                required
                placeholder="e.g., iPhone 15 Pro Max"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Price ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="1099.99"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Initial Stock</label>
                <input
                  type="number"
                  required
                  placeholder="25"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm"
                  value={newProductStock}
                  onChange={(e) => setNewProductStock(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                type="submit"
                disabled={isAdminCreating}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 text-sm"
              >
                {isAdminCreating ? 'Creating Product...' : 'Create Product'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdminForm(false)}
                className="px-4 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product list */}
      {products.length === 0 ? (
        <div className="text-center text-slate-500 py-16 bg-slate-900/20 rounded-3xl border border-slate-900/60">
          <span className="text-5xl block mb-4">🛒</span>
          <h3 className="text-lg font-bold text-slate-400">No products available</h3>
          <p className="text-sm text-slate-500 mt-1">Check back later or add one via the admin panel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="group bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-900/80 overflow-hidden hover:border-indigo-500/30 hover:-translate-y-1 transition-all duration-300 flex flex-col shadow-lg"
            >
              {/* Product Card Image Placeholder */}
              <div className="h-44 bg-slate-950 relative flex items-center justify-center border-b border-slate-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 group-hover:scale-105 transition-transform duration-300"></div>
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:border-indigo-500/20 transition-all">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-300">📦</span>
                </div>
                {/* Delete button for quick soft-delete */}
                <button
                  onClick={() => handleDeleteProduct(product.id, product.name)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-900/80 hover:bg-red-500/20 border border-slate-800 hover:border-red-500/30 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200"
                  title="Soft Delete Product"
                >
                  🗑️
                </button>
              </div>

              {/* Product Info */}
              <div className="p-5 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-bold text-slate-100 group-hover:text-white transition-colors text-base line-clamp-2">
                    {product.name}
                  </h3>
                </div>

                <div className="flex justify-between items-center my-4">
                  <span className="text-xl font-extrabold text-indigo-400">
                    ${parseFloat(product.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      product.stock > 0
                        ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10'
                        : 'bg-rose-500/5 text-rose-400 border-rose-500/10'
                    }`}
                  >
                    {product.stock > 0 ? `${product.stock} Units` : 'Out of Stock'}
                  </span>
                </div>

                {/* Buy button */}
                <button
                  onClick={() => handleOpenOrderModal(product)}
                  disabled={product.stock === 0}
                  className="w-full mt-auto bg-slate-900 border border-slate-800 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 disabled:bg-slate-950 disabled:border-slate-900 disabled:text-slate-600 text-slate-300 font-semibold py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
                >
                  {product.stock > 0 ? (
                    <>
                      <span>🛒</span> Buy Now
                    </>
                  ) : (
                    'Sold Out'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Creation Dialog (Modal Form) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="border-b border-slate-800 px-6 py-4 flex justify-between items-center bg-slate-950/40">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <span>🛒</span> Place Your Order
              </h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-white text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handlePlaceOrder} className="p-6 space-y-6">
              {orderError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs">
                  ⚠️ {orderError}
                </div>
              )}

              <div>
                <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Item Selected</h4>
                <div className="text-white font-bold text-lg mt-1">{selectedProduct.name}</div>
                <div className="text-indigo-400 font-semibold mt-0.5">
                  ${parseFloat(selectedProduct.price).toFixed(2)} each
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quantity</label>
                  <span className="text-xs text-slate-400">
                    Stock Available: <span className="text-white font-bold">{selectedProduct.stock}</span>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                    disabled={orderQuantity <= 1}
                    className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center hover:border-slate-700 text-lg text-slate-300 disabled:opacity-30 transition-all select-none"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct.stock}
                    required
                    className="flex-1 text-center h-12 bg-slate-950 border border-slate-800 rounded-xl text-lg font-bold text-white focus:outline-none focus:border-indigo-500 transition-all"
                    value={orderQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) {
                        setOrderQuantity(Math.min(selectedProduct.stock, Math.max(1, val)));
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setOrderQuantity(Math.min(selectedProduct.stock, orderQuantity + 1))}
                    disabled={orderQuantity >= selectedProduct.stock}
                    className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center hover:border-slate-700 text-lg text-slate-300 disabled:opacity-30 transition-all select-none"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 flex justify-between items-center">
                <span className="text-sm text-slate-400 font-medium">Estimated Total:</span>
                <span className="text-2xl font-black text-indigo-400">
                  ${(parseFloat(selectedProduct.price) * orderQuantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isOrdering}
                  className="flex-grow bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-2"
                >
                  {isOrdering ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    'Confirm Order'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-3 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-sm font-semibold transition-all hover:border-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

