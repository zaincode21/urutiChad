import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import TranslatedText from './TranslatedText';

const OnboardingTour = ({
  isVisible,
  onComplete,
  userRole = 'cashier',
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const getTourSteps = () => {
    if (userRole === 'cashier') {
      return [
        {
          title: "Welcome to Your Sales Dashboard! 🎉",
          content: "This is your personal sales workspace. Here you can track your performance and manage your daily tasks.",
          highlight: "dashboard-header"
        },
        {
          title: "Quick Actions",
          content: "Use these buttons to quickly access the most common tasks: create sales, manage customers, view products, and track expenses.",
          highlight: "quick-actions"
        },
        {
          title: "Your Performance Metrics",
          content: "These cards show your sales performance. Track your revenue, orders, and customer interactions.",
          highlight: "metrics-cards"
        },
        {
          title: "Navigation Menu",
          content: "Use the sidebar to navigate between different sections. You have access to Sales, Customers, and Expenses.",
          highlight: "navigation"
        },
        {
          title: "You're All Set! 🚀",
          content: "You now know the basics. Start by creating your first sale using the 'New Sale' button!",
          highlight: null
        }
      ];
    } else {
      return [
        {
          title: "Welcome to LikaBoutiques! 🎉",
          content: "This comprehensive dashboard gives you complete control over your retail operations.",
          highlight: "dashboard-header"
        },
        {
          title: "Quick Actions",
          content: "Access the most common tasks quickly: create sales, manage customers, view products, and track expenses.",
          highlight: "quick-actions"
        },
        {
          title: "Business Metrics",
          content: "Monitor your business performance with real-time metrics and analytics across all your shops.",
          highlight: "metrics-cards"
        },
        {
          title: "Shop Selection",
          content: "Use the shop selector to view data for specific locations or all shops combined.",
          highlight: "shop-selector"
        },
        {
          title: "Complete Navigation",
          content: "Access all features through the sidebar: products, inventory, orders, customers, analytics, and more.",
          highlight: "navigation"
        },
        {
          title: "Ready to Go! 🚀",
          content: "You have full access to all features. Start by exploring the different sections or creating your first order!",
          highlight: null
        }
      ];
    }
  };

  const steps = getTourSteps();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsCompleted(true);
    setTimeout(() => {
      onComplete();
    }, 1000);
  };

  const handleSkip = () => {
    onComplete();
  };

  if (!isVisible) return null;

  if (isCompleted) {
    return (
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
        <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2"><TranslatedText text="Tour Complete!" /></h3>
          <p className="text-gray-600 mb-6">You're ready to start using the system effectively.</p>
          <div className="flex items-center justify-center text-green-600">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">Onboarding completed</span>
          </div>
        </div>
      </div>
    );
  }

  const currentStepData = steps[currentStep];

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-2xl p-6 max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-blue-600 font-semibold text-sm">{currentStep + 1}</span>
            </div>
            <span className="text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          ></div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {currentStepData.title}
          </h3>
          <p className="text-gray-600 leading-relaxed">
            {currentStepData.content}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </button>

          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
