import React, { useState, useEffect } from 'react';
import TranslatedText from '../components/TranslatedText';
import {
  ArrowLeft,
  ShoppingCart,
  User,
  CreditCard,
  Scan,
  Search,
  Package,
  DollarSign,
  Clock,
  TrendingUp,
  Users,
  Zap,
  Settings,
  HelpCircle,
  Keyboard,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OrderForm from '../components/OrderForm';
import toast from 'react-hot-toast';

const CreateOrder = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOrderCreated = (newOrder) => {
    toast.success('Order created successfully!', {
      icon: '🎉',
      duration: 3000,
      style: {
        borderRadius: '10px',
        background: '#363636',
        color: '#fff',
      },
    });
    navigate('/orders');
  };

  const handleGoBack = () => {
    navigate('/orders');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Professional Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Left Section */}
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
              <button
                onClick={handleGoBack}
                className="flex items-center px-2 sm:px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 group min-h-[44px] touch-target"
              >
                <ArrowLeft className="h-5 w-5 sm:mr-2 group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:inline font-medium">Back to Orders</span>
              </button>

              <div className="hidden sm:block h-8 w-px bg-gray-300"></div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary-100 rounded-lg">
                  <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
                </div>
                <div>
                  <h1 className="text-base sm:text-xl font-bold text-gray-900 tracking-tight"><TranslatedText text="Point of Sale" /></h1>
                  <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Professional Sales Terminal</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                  LIVE
                </span>
              </div>
            </div>

            {/* Center Section - Time & Date */}
            <div className="hidden lg:flex items-center gap-4 lg:gap-6">
              <div className="text-center">
                <div className="text-lg font-mono font-bold text-gray-900">
                  {formatTime(currentTime)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(currentTime)}
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* Quick Stats */}
              <div className="hidden lg:flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span>Today: 266,847 CFA</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span>12 Orders</span>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                <Keyboard className="h-4 w-4" />
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">F2</kbd>
                <span>Barcode</span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">F3</kbd>
                <span>Scan</span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">F11</kbd>
                <span>Fullscreen</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Keyboard Shortcuts"
                >
                  <HelpCircle className="h-5 w-5" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? <Monitor className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                </button>

                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Keyboard className="h-5 w-5 mr-2" />
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Focus Barcode Scanner</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">F2</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Activate Scanner</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">F3</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Toggle Fullscreen</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">F11</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Quick Search</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">Ctrl + K</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Complete Order</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">Ctrl + Enter</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Quick Invoice</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs">F4</kbd>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                💡 Pro tip: Use keyboard shortcuts for faster checkout experience
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main POS Layout */}
      <main className="flex-1 w-full flex flex-col lg:flex-row gap-4 py-4 px-2 sm:px-4 lg:px-6">
        {/* Left: Product & Customer Search */}
        <section className="flex-1 min-w-0">
          <OrderForm
            onOrderCreated={handleOrderCreated}
            onClose={handleGoBack}
            isFullPage={true}
            modernPOS={true}
          />
        </section>
      </main>

      {/* Floating Action Bar */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-40">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowKeyboardShortcuts(true)}
            className="p-3 bg-white shadow-lg rounded-full text-gray-600 hover:text-gray-900 hover:shadow-xl transition-all duration-200"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="h-5 w-5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-3 bg-white shadow-lg rounded-full text-gray-600 hover:text-gray-900 hover:shadow-xl transition-all duration-200"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Monitor className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
          </button>
        </div>

        {/* Status Indicator */}
        <div className="bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-gray-700">POS Active</span>
        </div>
      </div>

      {/* Performance Tips */}
      {/* <div className="fixed top-20 right-4 bg-white shadow-lg rounded-lg p-4 max-w-xs z-20">
        <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
          <Zap className="h-4 w-4 mr-2 text-yellow-500" />
          Performance Tips
        </h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Use F2 to quickly focus barcode scanner</li>
          <li>• F3 activates scanner for hands-free operation</li>
          <li>• F4 generates invoice instantly for busy queues</li>
          <li>• Customer search supports partial names</li>
          <li>• Products auto-add on valid barcode scan</li>
        </ul>
      </div> */}
    </div>
  );
};

export default CreateOrder;
