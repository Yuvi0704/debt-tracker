import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, CreditCard, DollarSign, Calendar, LogOut, Menu, X } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const { signOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Debts', path: '/debts', icon: CreditCard },
    { name: 'Payments', path: '/payments', icon: DollarSign },
    { name: 'Planner', path: '/planner', icon: Calendar },
  ];

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="navbar glass">
      <div className="navbar-container container">
        <Link to="/" className="navbar-brand">
          <div className="brand-icon"><DollarSign size={20} /></div>
          <span className="brand-text">DebtFree</span>
        </Link>

        {/* Desktop Menu */}
        <div className="navbar-menu desktop-only">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="navbar-actions desktop-only">
          <button onClick={handleLogout} className="btn-icon" title="Logout">
            <LogOut size={20} />
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button className="btn-icon mobile-only" onClick={toggleMenu}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu animate-slide-up">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon size={20} />
                <span>{link.name}</span>
              </Link>
            );
          })}
          <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="mobile-nav-link text-danger">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
