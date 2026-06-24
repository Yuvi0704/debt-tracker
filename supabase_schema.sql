-- Run this script in the Supabase SQL Editor to set up the database schema

-- Enable UUID extension (usually enabled by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: debts
CREATE TABLE public.debts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  original_amount NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  interest_rate NUMERIC DEFAULT 0,
  minimum_payment NUMERIC DEFAULT 0,
  due_date INTEGER, -- day of month (1-31)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: payments
CREATE TABLE public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  payment_type TEXT NOT NULL,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: monthly_plans
CREATE TABLE public.monthly_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  income NUMERIC DEFAULT 0,
  fixed_expenses NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_plans ENABLE ROW LEVEL SECURITY;

-- Create policies so users can only access their own data

-- Debts policies
CREATE POLICY "Users can view their own debts" 
  ON public.debts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own debts" 
  ON public.debts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own debts" 
  ON public.debts FOR UPDATE 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own debts" 
  ON public.debts FOR DELETE 
  USING (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Users can view their own payments" 
  ON public.payments FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments" 
  ON public.payments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments" 
  ON public.payments FOR UPDATE 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payments" 
  ON public.payments FOR DELETE 
  USING (auth.uid() = user_id);

-- Monthly Plans policies
CREATE POLICY "Users can view their own monthly plans" 
  ON public.monthly_plans FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly plans" 
  ON public.monthly_plans FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly plans" 
  ON public.monthly_plans FOR UPDATE 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly plans" 
  ON public.monthly_plans FOR DELETE 
  USING (auth.uid() = user_id);
