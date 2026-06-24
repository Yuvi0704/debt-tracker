import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CreditCard, DollarSign, TrendingDown, Calendar, Target, Award } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [debts, setDebts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalDebt: 0,
    remainingBalance: 0,
    totalPaid: 0,
    monthlyTarget: 0,
    progressPercentage: 0,
    estimatedFreeDate: null
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [debtsResponse, paymentsResponse] = await Promise.all([
        supabase.from('debts').select('*'),
        supabase.from('payments').select('*').order('date', { ascending: true })
      ]);

      if (debtsResponse.error) throw debtsResponse.error;
      if (paymentsResponse.error) throw paymentsResponse.error;

      const debtsData = debtsResponse.data || [];
      const paymentsData = paymentsResponse.data || [];

      setDebts(debtsData);
      setPayments(paymentsData);
      calculateStats(debtsData, paymentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (debtsData, paymentsData) => {
    const totalOriginalDebt = debtsData.reduce((sum, d) => sum + Number(d.original_amount), 0);
    const currentRemaining = debtsData.reduce((sum, d) => sum + Number(d.current_balance), 0);
    const totalPaidAmount = paymentsData.reduce((sum, p) => sum + Number(p.amount), 0);
    const targetMonthly = debtsData.reduce((sum, d) => sum + Number(d.minimum_payment || 0), 0);
    
    // Calculate progress based on (Original - Current) / Original
    // Note: If original is 0, avoid division by zero
    const progress = totalOriginalDebt > 0 
      ? ((totalOriginalDebt - currentRemaining) / totalOriginalDebt) * 100 
      : 0;

    // Simple estimation: months = remaining / target
    let estDate = null;
    if (targetMonthly > 0 && currentRemaining > 0) {
      const monthsLeft = Math.ceil(currentRemaining / targetMonthly);
      estDate = addMonths(new Date(), monthsLeft);
    }

    setStats({
      totalDebt: totalOriginalDebt,
      remainingBalance: currentRemaining,
      totalPaid: totalPaidAmount, // Or totalOriginalDebt - currentRemaining depending on definition
      monthlyTarget: targetMonthly,
      progressPercentage: Math.max(0, Math.min(100, progress)), // clamp 0-100
      estimatedFreeDate: estDate
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Mock chart data for now, ideally derived from payment history
  const chartData = [
    { name: 'Jan', balance: 50000 },
    { name: 'Feb', balance: 48000 },
    { name: 'Mar', balance: 45000 },
    { name: 'Apr', balance: 43000 },
    { name: 'May', balance: 39000 },
    { name: 'Jun', balance: stats.remainingBalance || 39000 },
  ];

  if (loading) {
    return <div className="container mt-6"><p>Loading dashboard...</p></div>;
  }

  return (
    <div className="dashboard animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="h2">Dashboard</h1>
          <p className="text-muted">Welcome back! Here's your debt overview.</p>
        </div>
      </div>

      {/* Progress Section */}
      <div className="card glass mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="h4 flex items-center gap-2">
            <Award className="text-accent" size={20} />
            Financial Freedom Progress
          </h2>
          <span className="font-bold text-accent">{stats.progressPercentage.toFixed(1)}%</span>
        </div>
        <div className="progress-container mb-2">
          <div 
            className="progress-bar" 
            style={{ width: `${stats.progressPercentage}%` }}
          ></div>
        </div>
        {stats.estimatedFreeDate && (
          <p className="text-sm text-muted text-right">
            Estimated debt-free date: <strong className="text-primary">{format(stats.estimatedFreeDate, 'MMMM yyyy')}</strong>
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="stats-grid mb-6">
        <div className="stat-card card">
          <div className="stat-icon bg-danger-light text-danger">
            <CreditCard size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Debt</p>
            <p className="stat-value">{formatCurrency(stats.totalDebt)}</p>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-icon bg-success-light text-success">
            <TrendingDown size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Remaining Balance</p>
            <p className="stat-value">{formatCurrency(stats.remainingBalance)}</p>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-icon bg-primary-light text-primary">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Paid</p>
            <p className="stat-value">{formatCurrency(stats.totalPaid)}</p>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-icon bg-warning-light text-warning">
            <Target size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Monthly Target</p>
            <p className="stat-value">{formatCurrency(stats.monthlyTarget)}</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card mb-6">
        <h2 className="h4 mb-4">Debt Reduction Journey</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent-primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-accent-primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--color-text-muted)" tick={{fill: 'var(--color-text-secondary)'}} />
              <YAxis stroke="var(--color-text-muted)" tick={{fill: 'var(--color-text-secondary)'}} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--border-color)', borderRadius: 'var(--radius-sm)' }}
                itemStyle={{ color: 'var(--color-text-primary)' }}
              />
              <Area type="monotone" dataKey="balance" stroke="var(--color-accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
