import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import './Payments.css';

const Payments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    debt_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_type: 'minimum',
    payment_method: 'bank',
    notes: ''
  });

  const paymentTypes = ['minimum', 'extra', 'full payment', 'balance transfer', 'adjustment'];
  const paymentMethods = ['bank', 'credit card', 'cash', 'e-transfer'];

  useEffect(() => {
    if (user) {
      fetchDebts();
      fetchPayments();
    }
  }, [user]);

  const fetchDebts = async () => {
    const { data } = await supabase.from('debts').select('id, name, current_balance');
    setDebts(data || []);
    if (data && data.length > 0 && !formData.debt_id) {
      setFormData(prev => ({ ...prev, debt_id: data[0].id }));
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          debts (name)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const amount = parseFloat(formData.amount);
      
      // 1. Build explicit payload — no raw formData spread
      const payload = {
        user_id: user.id,
        debt_id: formData.debt_id,
        amount: amount,
        date: formData.date,
        payment_type: formData.payment_type,
        payment_method: formData.payment_method || null,
        notes: formData.notes || null
      };

      const { error: paymentError } = await supabase
        .from('payments')
        .insert([payload])
        .select();

      if (paymentError) throw paymentError;

      // 2. Update Debt Balance (Simple deduction)
      const selectedDebt = debts.find(d => d.id === formData.debt_id);
      if (selectedDebt) {
        const newBalance = Math.max(0, selectedDebt.current_balance - amount);
        const { error: debtError } = await supabase
          .from('debts')
          .update({ current_balance: newBalance })
          .eq('id', formData.debt_id);
        
        if (debtError) console.error("Failed to update debt balance", debtError);
      }
      
      setShowForm(false);
      setFormData(prev => ({ ...prev, amount: '', notes: '' }));
      fetchPayments();
      fetchDebts();
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Failed to add payment: ' + (error.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (payment) => {
    if (!window.confirm('Delete payment? This will NOT restore the debt balance automatically.')) return;
    
    try {
      const { error } = await supabase.from('payments').delete().eq('id', payment.id);
      if (error) throw error;
      fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // CSV Export functionality
  const downloadCSV = () => {
    const headers = ['Date', 'Debt Account', 'Amount', 'Type', 'Method', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...payments.map(p => [
        p.date,
        `"${p.debts?.name || 'Unknown'}"`,
        p.amount,
        p.payment_type,
        p.payment_method,
        `"${p.notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payments_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="payments-page animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="h2">Payments History</h1>
          <p className="text-muted">Track and log your debt payments.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={downloadCSV}>Export CSV</button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : <><Plus size={18} /> Log Payment</>}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card glass mb-6 animate-slide-up">
          <h2 className="h4 mb-4">Record New Payment</h2>
          {debts.length === 0 ? (
            <p className="text-danger">Please add a debt account first before logging payments.</p>
          ) : (
            <form onSubmit={handleSubmit} className="payment-form grid">
              <div className="form-group">
                <label className="label">Date</label>
                <input required type="date" name="date" value={formData.date} onChange={handleInputChange} className="input" />
              </div>
              
              <div className="form-group">
                <label className="label">Debt Account</label>
                <select name="debt_id" value={formData.debt_id} onChange={handleInputChange} className="input">
                  {debts.map(debt => (
                    <option key={debt.id} value={debt.id}>{debt.name} (Bal: {formatCurrency(debt.current_balance)})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Amount ($)</label>
                <input required type="number" step="0.01" name="amount" value={formData.amount} onChange={handleInputChange} className="input" placeholder="0.00" />
              </div>

              <div className="form-group">
                <label className="label">Payment Type</label>
                <select name="payment_type" value={formData.payment_type} onChange={handleInputChange} className="input">
                  {paymentTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Payment Method</label>
                <select name="payment_method" value={formData.payment_method} onChange={handleInputChange} className="input">
                  {paymentMethods.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              <div className="form-group col-span-full">
                <label className="label">Notes</label>
                <input type="text" name="notes" value={formData.notes} onChange={handleInputChange} className="input" placeholder="Optional notes" />
              </div>

              <div className="form-group col-span-full mt-4">
                <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <p>Loading payments...</p>
      ) : payments.length === 0 ? (
        <div className="card text-center py-12 glass">
          <DollarSign size={48} className="text-muted mx-auto mb-4" />
          <h3 className="h3 mb-2">No payments logged</h3>
          <p className="text-muted mb-4">You haven't recorded any payments yet. Keep pushing towards zero!</p>
        </div>
      ) : (
        <div className="table-container card">
          <table className="payments-table w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Debt Account</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(payment => (
                <tr key={payment.id}>
                  <td>{format(new Date(payment.date), 'MMM dd, yyyy')}</td>
                  <td><span className="font-bold">{payment.debts?.name}</span></td>
                  <td className="text-success font-bold">-{formatCurrency(payment.amount)}</td>
                  <td><span className="badge-outline">{payment.payment_type}</span></td>
                  <td className="text-muted text-sm">{payment.notes || '-'}</td>
                  <td>
                    <button className="btn-icon text-danger" onClick={() => handleDelete(payment)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Payments;
