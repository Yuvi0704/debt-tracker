import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, CreditCard } from 'lucide-react';
import './Debts.css';

const Debts = () => {
  const { user } = useAuth();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'credit card',
    original_amount: '',
    current_balance: '',
    interest_rate: '',
    minimum_payment: '',
    due_date: '',
    notes: ''
  });

  const debtTypes = [
    'credit card', 'personal loan', 'education loan', 'car loan', 'mortgage', 'other'
  ];

  useEffect(() => {
    if (user) fetchDebts();
  }, [user]);

  const fetchDebts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDebts(data || []);
    } catch (error) {
      console.error('Error fetching debts:', error);
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
    try {
      const payload = {
        user_id: user.id,
        name: formData.name,
        type: formData.type,
        original_amount: parseFloat(formData.original_amount),
        current_balance: parseFloat(formData.current_balance),
        interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : 0,
        minimum_payment: formData.minimum_payment ? parseFloat(formData.minimum_payment) : 0,
        due_date: formData.due_date ? parseInt(formData.due_date) : null,
        notes: formData.notes || null
      };

      const { data, error } = await supabase
        .from('debts')
        .insert([payload])
        .select();

      if (error) throw error;
      
      setShowForm(false);
      setFormData({
        name: '', type: 'credit card', original_amount: '', current_balance: '',
        interest_rate: '', minimum_payment: '', due_date: '', notes: ''
      });
      fetchDebts();
    } catch (error) {
      console.error('Error adding debt:', error);
      alert('Failed to add debt: ' + (error.message || 'Please try again.'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this debt? All associated payments will also be deleted.')) return;
    
    try {
      const { error } = await supabase.from('debts').delete().eq('id', id);
      if (error) throw error;
      fetchDebts();
    } catch (error) {
      console.error('Error deleting debt:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="debts-page animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="h2">Debt Accounts</h1>
          <p className="text-muted">Manage your active debts.</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : <><Plus size={18} /> Add Debt</>}
        </button>
      </div>

      {showForm && (
        <div className="card glass mb-6 animate-slide-up">
          <h2 className="h4 mb-4">Add New Debt</h2>
          <form onSubmit={handleSubmit} className="debt-form grid">
            <div className="form-group">
              <label className="label">Debt Name</label>
              <input required name="name" value={formData.name} onChange={handleInputChange} className="input" placeholder="e.g. Chase Sapphire" />
            </div>
            
            <div className="form-group">
              <label className="label">Debt Type</label>
              <select name="type" value={formData.type} onChange={handleInputChange} className="input">
                {debtTypes.map(type => (
                  <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Original Amount ($)</label>
              <input required type="number" step="0.01" name="original_amount" value={formData.original_amount} onChange={handleInputChange} className="input" />
            </div>

            <div className="form-group">
              <label className="label">Current Balance ($)</label>
              <input required type="number" step="0.01" name="current_balance" value={formData.current_balance} onChange={handleInputChange} className="input" />
            </div>

            <div className="form-group">
              <label className="label">Interest Rate (%)</label>
              <input type="number" step="0.01" name="interest_rate" value={formData.interest_rate} onChange={handleInputChange} className="input" placeholder="e.g. 19.99" />
            </div>

            <div className="form-group">
              <label className="label">Minimum Payment ($)</label>
              <input type="number" step="0.01" name="minimum_payment" value={formData.minimum_payment} onChange={handleInputChange} className="input" />
            </div>

            <div className="form-group">
              <label className="label">Due Date (Day of Month)</label>
              <input type="number" min="1" max="31" name="due_date" value={formData.due_date} onChange={handleInputChange} className="input" placeholder="e.g. 15" />
            </div>

            <div className="form-group col-span-full">
              <label className="label">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} className="input" rows="2"></textarea>
            </div>

            <div className="form-group col-span-full mt-4">
              <button type="submit" className="btn btn-primary w-full">Save Debt Account</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading debts...</p>
      ) : debts.length === 0 ? (
        <div className="card text-center py-12 glass">
          <CreditCard size={48} className="text-muted mx-auto mb-4" />
          <h3 className="h3 mb-2">No debts added yet</h3>
          <p className="text-muted mb-4">Start tracking your journey by adding your first debt account.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>Add Your First Debt</button>
        </div>
      ) : (
        <div className="debts-grid">
          {debts.map(debt => {
            const progress = debt.original_amount > 0 ? ((debt.original_amount - debt.current_balance) / debt.original_amount) * 100 : 0;
            return (
              <div key={debt.id} className="card debt-card hover:border-accent">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="h4">{debt.name}</h3>
                    <span className="badge">{debt.type}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-icon" onClick={() => handleDelete(debt.id)} title="Delete">
                      <Trash2 size={16} className="text-danger" />
                    </button>
                  </div>
                </div>

                <div className="debt-details mb-4">
                  <div className="detail-item">
                    <span className="text-sm text-muted">Balance</span>
                    <span className="font-bold text-lg">{formatCurrency(debt.current_balance)}</span>
                  </div>
                  <div className="detail-item text-right">
                    <span className="text-sm text-muted">Original</span>
                    <span className="font-bold text-lg text-muted">{formatCurrency(debt.original_amount)}</span>
                  </div>
                </div>

                <div className="progress-container mb-2 h-2">
                  <div className="progress-bar" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}></div>
                </div>
                <div className="flex justify-between text-xs text-muted mb-4">
                  <span>{progress.toFixed(1)}% Paid</span>
                  {debt.interest_rate > 0 && <span>{debt.interest_rate}% APR</span>}
                </div>

                <div className="debt-footer">
                  <div className="text-sm">
                    <span className="text-muted">Min Pay: </span>
                    <span className="font-bold">{formatCurrency(debt.minimum_payment)}</span>
                  </div>
                  {debt.due_date && (
                    <div className="text-sm">
                      <span className="text-muted">Due: </span>
                      <span className="font-bold">{debt.due_date}th</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Debts;
