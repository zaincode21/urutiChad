import React from 'react';
import {
    XCircle,
    User,
    Package,
    AlertCircle,
    Truck,
    CreditCard,
    Calendar,
    DollarSign,
    Edit,
    Download,
    CheckCircle
} from 'lucide-react';
import TranslatedText from '../TranslatedText';
import toast from 'react-hot-toast';

const OrderDetailModal = ({ isOpen, onClose, order, onEdit, onStatusUpdate }) => {
    if (!isOpen || !order) return null;

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'processing':
                return 'bg-blue-100 text-blue-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="h-4 w-4" />;
            case 'pending':
                return <Calendar className="h-4 w-4" />; // Using Calendar as placeholder for Clock if needed
            case 'processing':
                return <AlertCircle className="h-4 w-4" />;
            case 'cancelled':
                return <XCircle className="h-4 w-4" />;
            default:
                return <Package className="h-4 w-4" />;
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'CFA',
            minimumFractionDigits: 0,
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">
                        <TranslatedText text="Atelier Order Details" /> - #{order.order_number}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                    >
                        <XCircle className="h-6 w-6" />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Order Information */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Customer Information */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                <User className="h-5 w-5 mr-2 text-blue-600" />
                                <TranslatedText text="Customer Information" />
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">
                                        <strong><TranslatedText text="Name" />:</strong> {order.customer_name || `${order.first_name || ''} ${order.last_name || ''}`}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        <strong><TranslatedText text="Email" />:</strong> {order.customer_email || order.email || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">
                                        <strong><TranslatedText text="Phone" />:</strong> {order.customer_phone || order.phone || 'N/A'}
                                    </p>
                                    {order.customer_id && (
                                        <p className="text-sm text-gray-600">
                                            <strong><TranslatedText text="Customer ID" />:</strong> {order.customer_id}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="bg-white border rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                <Package className="h-5 w-5 mr-2 text-green-600" />
                                <TranslatedText text="Order Items" />
                            </h4>
                            {order.items && order.items.length > 0 ? (
                                <div className="space-y-3">
                                    {order.items.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <Package className="h-6 w-6 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{item.product_name || 'Atelier Item'}</p>
                                                    <p className="text-sm text-gray-600">SKU: {item.sku || 'N/A'}</p>
                                                    {item.is_atelier_item && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                            <TranslatedText text="Custom Item" />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-gray-900">
                                                    <TranslatedText text="Qty" />: {item.quantity}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {formatCurrency(item.unit_price)} <TranslatedText text="each" />
                                                </p>
                                                <p className="font-semibold text-blue-600">
                                                    {formatCurrency(item.total_price)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">
                                    <TranslatedText text="No items found for this order" />
                                </p>
                            )}
                        </div>

                        {/* Measurements & Specifications */}
                        {order.notes && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                    <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" />
                                    <TranslatedText text="Order Notes & Specifications" />
                                </h4>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {order.notes}
                                </div>
                            </div>
                        )}

                        {/* Shipping & Billing Addresses */}
                        {(order.shipping_address || order.billing_address) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {order.shipping_address && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                                            <Truck className="h-4 w-4 mr-2 text-blue-600" />
                                            <TranslatedText text="Shipping Address" />
                                        </h4>
                                        <div className="text-sm text-gray-600">
                                            {typeof order.shipping_address === 'object' ? (
                                                <>
                                                    <p>{order.shipping_address.street}</p>
                                                    <p>{order.shipping_address.city}, {order.shipping_address.state}</p>
                                                    <p>{order.shipping_address.postal_code}</p>
                                                    <p>{order.shipping_address.country}</p>
                                                </>
                                            ) : (
                                                <p>{order.shipping_address}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {order.billing_address && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                                            <CreditCard className="h-4 w-4 mr-2 text-green-600" />
                                            <TranslatedText text="Billing Address" />
                                        </h4>
                                        <div className="text-sm text-gray-600">
                                            {typeof order.billing_address === 'object' ? (
                                                <>
                                                    <p>{order.billing_address.street}</p>
                                                    <p>{order.billing_address.city}, {order.billing_address.state}</p>
                                                    <p>{order.billing_address.postal_code}</p>
                                                    <p>{order.billing_address.country}</p>
                                                </>
                                            ) : (
                                                <p>{order.billing_address}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column - Order Summary & Actions */}
                    <div className="space-y-6">
                        {/* Order Summary */}
                        <div className="bg-white border rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                                <TranslatedText text="Order Summary" />
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600"><TranslatedText text="Order Date" />:</span>
                                    <span className="text-sm font-medium">{formatDate(order.created_at)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600"><TranslatedText text="Status" />:</span>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                        {getStatusIcon(order.status)}
                                        <span className="ml-1 capitalize">{order.status}</span>
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600"><TranslatedText text="Payment Method" />:</span>
                                    <span className="text-sm font-medium capitalize">{order.payment_method || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600"><TranslatedText text="Payment Status" />:</span>
                                    <span className={`text-sm font-medium ${order.payment_status === 'completed' ? 'text-green-600' : order.payment_status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>
                                        {order.payment_status || 'N/A'}
                                    </span>
                                </div>
                                {order.shop_name && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600"><TranslatedText text="Shop" />:</span>
                                        <span className="text-sm font-medium">{order.shop_name}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Financial Summary */}
                        <div className="bg-gray-50 border rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                                <TranslatedText text="Financial Summary" />
                            </h4>
                            <div className="space-y-2">
                                {(order.subtotal !== undefined) && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600"><TranslatedText text="Subtotal" />:</span>
                                        <span className="text-sm font-medium">{formatCurrency(order.subtotal)}</span>
                                    </div>
                                )}
                                {(order.tax_amount !== undefined) && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600"><TranslatedText text="Tax" />:</span>
                                        <span className="text-sm font-medium">{formatCurrency(order.tax_amount)}</span>
                                    </div>
                                )}
                                {(order.discount_amount !== undefined && order.discount_amount > 0) && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600"><TranslatedText text="Discount" />:</span>
                                        <span className="text-sm font-medium text-red-600">-{formatCurrency(order.discount_amount)}</span>
                                    </div>
                                )}
                                <div className="border-t pt-2">
                                    <div className="flex justify-between">
                                        <span className="font-semibold text-gray-900"><TranslatedText text="Total Amount" />:</span>
                                        <span className="font-bold text-lg text-blue-600">{formatCurrency(order.total_amount)}</span>
                                    </div>
                                </div>
                                {(order.amount_paid !== undefined) && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600"><TranslatedText text="Amount Paid" />:</span>
                                        <span className="text-sm font-medium text-green-600">{formatCurrency(order.amount_paid)}</span>
                                    </div>
                                )}
                                {(order.remaining_amount !== undefined) && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600"><TranslatedText text="Remaining" />:</span>
                                        <span className="text-sm font-medium text-orange-600">{formatCurrency(order.remaining_amount)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={() => onEdit && onEdit(order)}
                                className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <Edit className="h-4 w-4 mr-2 inline" />
                                <TranslatedText text="Edit Order" />
                            </button>

                            <button
                                onClick={() => {
                                    window.print();
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <Download className="h-4 w-4 mr-2 inline" />
                                <TranslatedText text="Print Order" />
                            </button>

                            {order.status === 'pending' && onStatusUpdate && (
                                <button
                                    onClick={() => onStatusUpdate(order, 'processing')}
                                    className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                    <CheckCircle className="h-4 w-4 mr-2 inline" />
                                    <TranslatedText text="Mark as Processing" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <TranslatedText text="Close" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailModal;
