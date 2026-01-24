import React, { useState } from 'react';
import TranslatedText from '../components/TranslatedText';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, Lock, User, Home, Store, Award, CreditCard } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import toast from 'react-hot-toast';

const Login = () => {
  const { tSync } = useTranslation();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, setUserFromStorage } = useAuth();

  const loginMutation = useMutation({
    mutationFn: (credentials) => api.post('/auth/login', credentials),
    onSuccess: async (response) => {
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      // Update the auth context state
      setUserFromStorage();
      toast.success('Welcome back!');

      // Role-based navigation
      if (user.role === 'cashier') {
        navigate('/orders/create');
      } else if (user.role === 'manager') {
        navigate('/stocks');
      } else {
        navigate('/dashboard');
      }
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Login failed. Please try again.';
      toast.error(<TranslatedText text={message} />);
      setIsLoading(false);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    loginMutation.mutate(formData);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const features = [
    {
      icon: Store,
      title: <TranslatedText text="Multi-Shop Management" />,
      description: <TranslatedText text="Manage multiple retail locations with centralized control" />
    },
    {
      icon: Award,
      title: <TranslatedText text="Loyalty Program" />,
      description: <TranslatedText text="Customer loyalty tiers and points management system" />
    },
    {
      icon: CreditCard,
      title: <TranslatedText text="Layaway System" />,
      description: <TranslatedText text="Advanced payment and installment tracking" />
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex relative overflow-hidden">
      {/* Professional Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23 11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20"></div>

      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/50">
                <Home className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              <TranslatedText text="Welcome Back" />
            </h2>
            <p className="text-gray-300">
              <TranslatedText text="Sign in to your LikaBoutiques account" />
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText text="Username or Email" />
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white"
                    placeholder={tSync("Enter your username or email")}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslatedText text="Password" />
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white"
                    placeholder={tSync("Enter your password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    <TranslatedText text="Remember me" />
                  </label>
                </div>
                <div className="text-sm">
                  <a href="#" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                    <TranslatedText text="Forgot password?" />
                  </a>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    <TranslatedText text="Signing in..." />
                  </div>
                ) : (
                  <TranslatedText text="Sign in" />
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-gray-300">
              <TranslatedText text="Don't have an account?" />{' '}
              <Link to="/register" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                <TranslatedText text="Contact your administrator" />
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Features & Branding */}
      <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center bg-gradient-to-br from-slate-800/50 via-slate-700/30 to-slate-800/50 relative overflow-hidden backdrop-blur-sm border-l border-white/10">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="relative z-10 max-w-lg mx-auto px-8 text-center text-white">
          {/* Brand */}
          <div className="mb-12">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/50">
              <Home className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              LikaBoutiques
            </h1>
            <p className="text-xl text-gray-300 leading-relaxed">
              Comprehensive retail management platform with multi-currency support,
              advanced analytics, and complete business automation.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-8">
            <h3 className="text-2xl font-semibold mb-6"><TranslatedText text="Platform Features" /></h3>
            <div className="grid gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="flex items-start space-x-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 hover:border-white/20"
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 rounded-xl flex items-center justify-center border border-white/10">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-lg font-semibold mb-1 text-white">{feature.title}</h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="text-2xl font-bold text-white">500+</div>
              <div className="text-sm text-gray-300"><TranslatedText text="Active Users" /></div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="text-2xl font-bold text-white">50+</div>
              <div className="text-sm text-gray-300"><TranslatedText text="Retail Locations" /></div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="text-2xl font-bold text-white">99.9%</div>
              <div className="text-sm text-gray-300"><TranslatedText text="Uptime" /></div>
            </div>
          </div>
        </div>

        {/* Subtle Floating Elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-10 w-16 h-16 bg-purple-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>
    </div>
  );
};

export default Login; 
