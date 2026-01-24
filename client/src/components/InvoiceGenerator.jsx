import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Eye, 
  X, 
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import TranslatedText from './TranslatedText';

const InvoiceGenerator = ({ orderId, orderNumber, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleInvoiceAction = async (action) => {
    setLoading(true);
    try {
      switch (action) {
        case 'download-invoice':
          await downloadInvoice();
          break;
        case 'download-receipt':
          await downloadReceipt();
          break;
        case 'print-invoice':
          await printInvoice();
          break;
        case 'preview-invoice':
          await previewInvoice();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Error in ${action}:`, error);
      toast.error(`Failed to ${action.replace('-', ' ')}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async () => {
    try {
      const response = await api.get(`/invoices/${orderId}/invoice`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${orderNumber}-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Invoice downloaded successfully!');
    } catch (error) {
      console.error('Download invoice error:', error);
      throw error;
    }
  };

  const downloadReceipt = async () => {
    try {
      const response = await api.get(`/invoices/${orderId}/receipt`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${orderNumber}-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Receipt downloaded successfully!');
    } catch (error) {
      console.error('Download receipt error:', error);
      throw error;
    }
  };

  const printInvoice = async () => {
    try {
      // First get the invoice HTML with authentication
      const response = await api.get(`/invoices/${orderId}/preview`);
      const htmlContent = response.data;
      
      // Create a new window with the HTML content
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        toast.error('Please allow popups to print invoices');
        return;
      }
      
      // Write the HTML content to the new window
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = function() {
        printWindow.print();
        // Close window after printing (optional)
        setTimeout(() => {
          printWindow.close();
        }, 2000);
      };
      
      toast.success('Print window opened successfully!');
    } catch (error) {
      console.error('Print invoice error:', error);
      toast.error('Failed to open print window');
    }
  };

  const previewInvoice = async () => {
    try {
      const response = await api.get(`/invoices/${orderId}/preview`);
      const htmlContent = response.data;
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview invoice error:', error);
      throw error;
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setShowPreview(false);
  };

  const invoiceActions = [
    {
      id: 'download-invoice',
      label: 'Download Invoice',
      icon: Download,
      description: 'Download a professional PDF invoice',
      color: 'bg-blue-500 hover:bg-blue-600',
      iconColor: 'text-blue-500'
    },
    {
      id: 'download-receipt',
      label: 'Download Receipt',
      icon: FileText,
      description: 'Download a simple receipt PDF',
      color: 'bg-green-500 hover:bg-green-600',
      iconColor: 'text-green-500'
    },
    {
      id: 'print-invoice',
      label: 'Print Invoice',
      icon: Printer,
      description: 'Print invoice directly to printer',
      color: 'bg-purple-500 hover:bg-purple-600',
      iconColor: 'text-purple-500'
    },
    {
      id: 'preview-invoice',
      label: 'Preview Invoice',
      icon: Eye,
      description: 'Preview invoice before printing',
      color: 'bg-orange-500 hover:bg-orange-600',
      iconColor: 'text-orange-500'
    }
  ];

  if (showPreview) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
          {/* Preview Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-primary-500 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Invoice Preview - {orderNumber}
                </h2>
                <p className="text-sm text-gray-500">
                  Preview your invoice before printing or downloading
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={printInvoice}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Print Invoice"
              >
                <Printer className="h-5 w-5" />
              </button>
              <button
                onClick={downloadInvoice}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Download Invoice"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={closePreview}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Close Preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-hidden">
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="Invoice Preview"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-primary-500 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Invoice & Receipt Generation
              </h2>
              <p className="text-sm text-gray-500">
                Order #{orderNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Choose an action:
            </h3>
            <p className="text-sm text-gray-600">
              Generate and manage invoices and receipts for this order
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invoiceActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleInvoiceAction(action.id)}
                  disabled={loading}
                  className={`
                    relative p-6 border border-gray-200 rounded-lg hover:border-gray-300 
                    transition-all duration-200 text-left group
                    ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
                    ${action.color}
                  `}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`
                      p-3 rounded-lg bg-white/20 backdrop-blur-sm
                      ${action.iconColor}
                    `}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white mb-1">
                        {action.label}
                      </h4>
                      <p className="text-sm text-white/80">
                        {action.description}
                      </p>
                    </div>
                    {loading && (
                      <div className="absolute top-2 right-2">
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Info Section */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">
                  Invoice Features
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Professional PDF format with company branding</li>
                  <li>• Complete order details and customer information</li>
                  <li>• Itemized product list with pricing</li>
                  <li>• Tax, discount, and total calculations</li>
                  <li>• Print-ready format for physical copies</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900 mb-1">
                  Tips
                </h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Use "Preview" to check the invoice before printing</li>
                  <li>• "Print Invoice" opens in a new window for printing</li>
                  <li>• Receipts are simpler and more compact than invoices</li>
                  <li>• Downloaded files are automatically named with order number</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGenerator; 
