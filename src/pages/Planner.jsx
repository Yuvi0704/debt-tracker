import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, DollarSign, ArrowRight, Save } from 'lucide-react';
import './Planner.css';

const Planner = () => {
  const { user } = useAuth();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const [planData, setPlanData] = useState({
    id: null,
    income: '',
    fixed_expenses: ''
  });

  useEffect(() => {
    if (user) {
      fetchDebts();
      fetchPlan();
    }
  }, [user, month, year]);

  const fetchDebts = async () => {
    const { data } = await supabase.from('debts').select('*').order('due_date', { ascending: true });
    setDebts(data || []);
  };

  const fetchPlan = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('monthly_plans')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .single();

    if (data) {
      setPlanData({
        id: data.id,
        income: data.income,
        fixed_expenses: data.fixed_expenses
      });
    } else {
      setPlanData({ id: null, income: '', fixed_expenses: '' });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        month,
        year,
        income: parseFloat(planData.income) || 0,
        fixed_expenses: parseFloat(planData.fixed_expenses) || 0
      };

      let error;
      if (planData.id) {
        const { error: updateError } = await supabase.from('monthly_plans').update(payload).eq('id', planData.id);
        error = updateError;
      } else {
        const { data, error: insertError } = await supabase.from('monthly_plans').insert([payload]).select().single();
        if (data) setPlanData(prev => ({ ...prev, id: data.id }));
        error = insertError;
      }

      if (error) throw error;
      alert('Plan saved successfully!');
    } catch (error) {
      console.error("Failed to save plan", error);
      alert('Failed to save plan. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculations
  const totalIncome = parseFloat(planData.income) || 0;
  const totalFixedExpenses = parseFloat(planData.fixed_expenses) || 0;
  const totalMinPayments = debts.reduce((sum, d) => sum + Number(d.minimum_payment || 0), 0);
  
  const remainingAfterFixed = totalIncome - totalFixedExpenses;
  const remainingAfterMins = remainingAfterFixed - totalMinPayments;
  
  // Suggest 50% of remaining for extra debt payment
  const recommendedExtra = remainingAfterMins > 0 ? remainingAfterMins * 0.5 : 0;
  const finalLeftover = remainingAfterMins - recommendedExtra;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="planner-page animate-fade-in">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="h2">Monthly Planner</h1>
          <p className="text-muted">Plan your budget and crush your debts.</p>
        </div>
        <div className="flex gap-4">
          <select 
            value={month} 
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="input w-auto"
          >
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={year} 
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="input w-auto"
          >
            {[year-1, year, year+1, year+2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid">
        <div className="flex-col gap-6">
          <div className="card glass">
            <h2 className="h4 mb-4 flex items-center gap-2">
              <DollarSign className="text-accent" /> Base Budget
            </h2>
            <div className="form-group mb-4">
              <label className="label">Expected Income ($)</label>
              <input 
                type="number" 
                className="input text-lg" 
                value={planData.income}
                onChange={e => setPlanData({...planData, income: e.target.value})}
                placeholder="e.g. 5000"
              />
            </div>
            <div className="form-group mb-4">
              <label className="label">Fixed Expenses ($) (Rent, Groceries, etc.)</label>
              <input 
                type="number" 
                className="input text-lg" 
                value={planData.fixed_expenses}
                onChange={e => setPlanData({...planData, fixed_expenses: e.target.value})}
                placeholder="e.g. 2500"
              />
            </div>
            <button className="btn btn-primary w-full mt-2" onClick={handleSave} disabled={isSaving}>
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save Budget'}
            </button>
          </div>

          <div className="card">
            <h2 className="h4 mb-4">Minimum Debt Payments</h2>
            {debts.length === 0 ? (
              <p className="text-muted">No active debts found.</p>
            ) : (
              <div className="min-payments-list">
                {debts.map(debt => (
                  <div key={debt.id} className="flex justify-between items-center py-2 border-b border-[var(--border-color)]">
                    <div>
                      <span className="font-bold">{debt.name}</span>
                      <p className="text-xs text-muted">Due: {debt.due_date ? `${debt.due_date}th` : 'N/A'}</p>
                    </div>
                    <span className="text-danger font-bold">-{formatCurrency(debt.minimum_payment)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-3 mt-2">
                  <span className="font-bold">Total Minimums</span>
                  <span className="text-danger font-bold text-lg">-{formatCurrency(totalMinPayments)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card summary-card glass">
            <h2 className="h4 mb-6">Summary Plan</h2>
            
            <div className="summary-row">
              <span>Income</span>
              <span className="text-success font-bold">{formatCurrency(totalIncome)}</span>
            </div>
            
            <div className="summary-row">
              <span>Fixed Expenses</span>
              <span className="text-danger">-{formatCurrency(totalFixedExpenses)}</span>
            </div>

            <div className="summary-row highlight">
              <span>Remaining After Expenses</span>
              <span>{formatCurrency(remainingAfterFixed)}</span>
            </div>

            <div className="summary-row">
              <span>Minimum Debt Payments</span>
              <span className="text-danger">-{formatCurrency(totalMinPayments)}</span>
            </div>

            <div className="summary-row highlight border-t-2">
              <span>Available for Extra Debt</span>
              <span className="font-bold text-lg text-primary">{formatCurrency(remainingAfterMins)}</span>
            </div>

            {remainingAfterMins > 0 ? (
              <div className="recommendation-box mt-6 animate-slide-up">
                <h3 className="h4 flex items-center gap-2 mb-2">
                  <ArrowRight className="text-accent" /> Recommended Action
                </h3>
                <p className="text-sm text-muted mb-4">
                  Allocate 50% of your remaining money towards extra debt payments to accelerate your journey to financial freedom.
                </p>
                <div className="flex justify-between items-center bg-accent-transparent p-4 rounded-md">
                  <span>Extra Payment</span>
                  <span className="font-bold text-accent text-xl">{formatCurrency(recommendedExtra)}</span>
                </div>
                <div className="mt-4 text-center text-sm text-muted">
                  Leaving {formatCurrency(finalLeftover)} for discretionary spending.
                </div>
              </div>
            ) : (
              <div className="recommendation-box bg-danger-transparent mt-6">
                <p className="text-danger">You don't have enough remaining funds to cover minimum payments. Consider reducing fixed expenses or increasing income.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Planner;
