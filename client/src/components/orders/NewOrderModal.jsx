
"use client";

import MaterialIcon from "../icons/MaterialIcon";
import { useState, useEffect } from "react";
import { clientsApi } from "../../lib/clients-api";

import { inventoryApi } from "../../lib/inventory-api";
import { calculateFabricQuantity, formatCalculationResult } from "../../utils/fabric-calculator";
import toast from "react-hot-toast";
import { ordersApi } from "../../lib/orders-api";
import { userApi } from "../../lib/user-api";
import { useTranslation } from "../../hooks/useTranslation";
import TranslatedText from "../TranslatedText";

export default function NewOrderModal({ isOpen, onClose, onOrderCreated }) {
    const { tSync, translateBatch } = useTranslation();
    const [currentStep, setCurrentStep] = useState(1);

    // Pre-fetch translations for placeholders and strict string requirements
    useEffect(() => {
        const placeholders = [
            'Search by name, email or phone...',
            'Enter full name',
            'Enter phone number',
            'Enter email address',
            'Enter any specific design requirements, modifications, or special instructions here...',
            'Search fabrics, buttons, zippers...'
        ];
        translateBatch(placeholders);
    }, []);

    // Client Selection State
    const [clients, setClients] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedClient, setSelectedClient] = useState(null);
    const [isLoadingClients, setIsLoadingClients] = useState(false);

    // Quick Add Client State
    const [quickClient, setQuickClient] = useState({ fullName: "", phone: "", email: "" });

    // New Order Parameters
    const [targetDate, setTargetDate] = useState("");
    const [orderPriority, setOrderPriority] = useState("Standard");
    const [assignedReceptionist, setAssignedReceptionist] = useState("Elena Gilbert (Current)");

    // Measurement State
    const [measurementValues, setMeasurementValues] = useState({});
    const [garmentType, setGarmentType] = useState('suit');
    const [useLastRecorded, setUseLastRecorded] = useState(true);

    // Inventory State
    const [inventoryItems, setInventoryItems] = useState([]);
    const [selectedOrderItems, setSelectedOrderItems] = useState([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);
    const [selectedMaterialTab, setSelectedMaterialTab] = useState('fabric');

    // Submission State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdOrderNumber, setCreatedOrderNumber] = useState(null);

    // Tailor State
    const [tailors, setTailors] = useState([]);
    const [selectedTailorId, setSelectedTailorId] = useState("");

    // Order Description
    const [orderDescription, setOrderDescription] = useState("");

    // Cost Calculation State
    const [materialCost, setMaterialCost] = useState(0);
    const [laborCost, setLaborCost] = useState(0);
    const [taxAmount, setTaxAmount] = useState(0);
    const [totalOrderCost, setTotalOrderCost] = useState(0);

    // Dynamic Cost Calculation
    useEffect(() => {
        // 1. Material Cost: Sum of all selected inventory items
        const materials = selectedOrderItems.reduce((sum, item) => {
            return sum + (Number(item.unitPrice || 0) * Number(item.quantity || 0));
        }, 0);

        // 2. Labor Cost: Manually entered by user
        // We no longer auto-calculate based on garment type to force user input

        const subtotal = materials + laborCost;
        const tax = 0; // No tax for atelier
        const discountAmount = 0;
        const totalAmount = subtotal + tax - discountAmount;

        setMaterialCost(materials);
        setTaxAmount(tax);
        setTotalOrderCost(totalAmount);

    }, [selectedOrderItems, garmentType, laborCost]);

    // Measurement field configurations per garment type
    const measurementFields = {
        suit: [
            { key: "jacket_length", label: <TranslatedText text="Jacket Length" />, shortLabel: "Jacket" },
            { key: "shoulder_width", label: <TranslatedText text="Shoulder Width" />, shortLabel: "Shoulder" },
            { key: "sleeve_length", label: <TranslatedText text="Sleeve Length" />, shortLabel: "Sleeve" },
            { key: "chest", label: <TranslatedText text="Chest" />, shortLabel: "Chest" },
            { key: "waist", label: <TranslatedText text="Waist" />, shortLabel: "Waist" },
            { key: "back_width", label: <TranslatedText text="Back Width" />, shortLabel: "Back" },
            { key: "lapel_width", label: <TranslatedText text="Lapel Width" />, shortLabel: "Lapel" },
        ],
        dress: [
            { key: "neck", label: <TranslatedText text="Neck" />, shortLabel: "Neck" },
            { key: "chest", label: <TranslatedText text="Chest" />, shortLabel: "Chest" },
            { key: "waist", label: <TranslatedText text="Waist" />, shortLabel: "Waist" },
            { key: "hips", label: <TranslatedText text="Hips" />, shortLabel: "Hips" },
            { key: "shoulder", label: <TranslatedText text="Shoulder" />, shortLabel: "Shoulder" },
            { key: "sleeve", label: <TranslatedText text="Sleeve" />, shortLabel: "Sleeve" },
        ],
        shirt: [
            { key: "collar", label: <TranslatedText text="Collar" />, shortLabel: "Collar" },
            { key: "chest", label: <TranslatedText text="Chest" />, shortLabel: "Chest" },
            { key: "waist", label: <TranslatedText text="Waist" />, shortLabel: "Waist" },
            { key: "shirt_length", label: <TranslatedText text="Shirt Length" />, shortLabel: "Length" },
            { key: "sleeve_length", label: <TranslatedText text="Sleeve Length" />, shortLabel: "Sleeve" },
            { key: "cuff", label: <TranslatedText text="Cuff" />, shortLabel: "Cuff" },
        ],
    };

    useEffect(() => {
        if (isOpen && currentStep === 1) {
            loadClients();
            loadTailors();
        }
        if (isOpen && currentStep === 3 && inventoryItems.length === 0) {
            loadInventory();
        }
    }, [isOpen, currentStep]);

    const loadTailors = async () => {
        try {
            const tailorUsers = await userApi.getAll({ role: 'tailor', status: 'active' });
            setTailors(tailorUsers);
            if (tailorUsers.length > 0) {
                setSelectedTailorId(tailorUsers[0].id);
            }
        } catch (error) {
            console.error("Failed to load tailors", error);
            // toast.error("Failed to load tailors"); // Suppress excessive toasts
        }
    };

    const loadInventory = async () => {
        setIsLoadingInventory(true);
        try {
            const data = await inventoryApi.getAll();
            setInventoryItems(data);
        } catch (error) {
            console.error("Failed to load inventory", error);
        } finally {
            setIsLoadingInventory(false);
        }
    };

    const handleAddToOrder = (item) => {
        if (selectedOrderItems.find(i => i.inventoryItemId === item.id)) {
            toast.error('Item already added to order');
            return;
        }

        let calculatedQuantity = 1; // default
        let calculationInfo = '';

        // Auto-calculate for fabric items
        if ((item.itemType === 'fabric' || item.type === 'fabric') && measurementValues && Object.keys(measurementValues).length > 0) {
            try {
                const result = calculateFabricQuantity({
                    garmentType,
                    measurements: measurementValues,
                    fabricWidth: item.widthCm || 140,
                    includeBuffer: true
                });

                calculatedQuantity = result.quantity;
                calculationInfo = result.breakdown;

                toast.success(`Auto-calculated: ${formatCalculationResult(result)}`);
            } catch (error) {
                console.error('Fabric calculation error:', error);
                toast.error('Could not auto-calculate fabric quantity, using default');
            }
        }

        setSelectedOrderItems(prev => [...prev, {
            inventoryItemId: item.id,
            description: item.name || item.itemName,
            quantity: calculatedQuantity,
            unitPrice: item.sellingPrice,
            unitOfMeasure: item.unitOfMeasure || item.unit,
            image: item.imageUrl,
            available: item.quantityAvailable
        }]);
    };

    const handleRemoveItem = (itemId) => {
        setSelectedOrderItems(prev => prev.filter(i => i.inventoryItemId !== itemId));
    };

    const handleUpdateQuantity = (itemId, qty) => {
        setSelectedOrderItems(prev => prev.map(i => i.inventoryItemId === itemId ? { ...i, quantity: qty } : i));
    };

    const handleSubmitOrder = async () => {
        // If quick client is filled, use it; otherwise require selectedClient
        const hasQuickClient = quickClient.fullName && quickClient.phone;
        const hasSelectedClient = !!selectedClient;

        if (!hasSelectedClient && !hasQuickClient) {
            toast.error("Please select a client or enter new client details.");
            return;
        }

        setIsSubmitting(true);
        try {
            let finalClientId = selectedClient?.id;

            // Handle Quick Client Creation here if needed
            if (!finalClientId && hasQuickClient) {
                // For now, we'll skip order creation if no valid client is selected
                toast.error("Please select an existing client. Quick client creation is not yet implemented.");
                setIsSubmitting(false);
                return;
            }

            // Validate that we have a valid customer_id (should be UUID)
            if (!finalClientId || finalClientId.length !== 36) {
                toast.error("Please select a valid client before creating the order.");
                setIsSubmitting(false);
                return;
            }

            // Validate that we have items with valid product_ids
            if (selectedOrderItems.length === 0) {
                toast.error("Please add at least one item to the order.");
                setIsSubmitting(false);
                return;
            }

            // Validate that all items have valid UUIDs as product_ids
            for (const item of selectedOrderItems) {
                if (!item.inventoryItemId || item.inventoryItemId.length !== 36) {
                    toast.error(`Invalid product ID for item: ${item.description}`);
                    setIsSubmitting(false);
                    return;
                }
            }

            // Calculate totals for the order
            const materialsTotal = selectedOrderItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

            // Total should include Labor Cost
            const subtotal = materialsTotal + laborCost;
            const tax = 0; // No tax for atelier orders
            const discountAmount = 0; // No discounts for now
            const totalAmount = subtotal + tax - discountAmount;

            const payload = {
                customer_id: finalClientId,
                items: [
                    ...selectedOrderItems.map(item => ({
                        product_id: item.inventoryItemId,
                        quantity: parseInt(item.quantity) || 1,
                        price: parseFloat(item.unitPrice) || 0,
                        total: parseFloat(item.unitPrice || 0) * parseInt(item.quantity || 1),
                        is_atelier_item: true,
                    })),
                    // Add Service/Labor Cost as an item
                    {
                        product_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID for Service
                        quantity: 1,
                        price: laborCost,
                        total: laborCost,
                        is_atelier_item: true,
                        is_service: true, // Signal to backend to treat this differently
                        name: 'Tailoring & Design Service'
                    }
                ],
                payment_method: 'cash',

                notes: `${orderDescription} | Priority: ${orderPriority} | Target: ${targetDate}`,
                currency: 'CFA',
                subtotal: subtotal,
                tax_amount: tax,
                discount_amount: discountAmount,
                total_amount: totalAmount,
                // Deposit is Material Cost, Remaining is Labor


                amount_paid: materialCost, // The user MUST pay materials upfront
                remaining_amount: totalAmount - materialCost, // Which should equal laborCost
                status: 'pending', // Order status
                // Payment status: if materials paid, it's 'partial'
                payment_status: materialCost > 0 ? 'partial' : 'pending',
                discounts: []
            };

            console.log('Order payload:', JSON.stringify(payload, null, 2));
            console.log('Selected client:', selectedClient);
            console.log('Selected order items:', selectedOrderItems);

            const newOrder = await ordersApi.create(payload);
            setCreatedOrderNumber(newOrder.order_number);
            if (onOrderCreated) {
                onOrderCreated(newOrder);
            }
            nextStep();
        } catch (error) {
            console.error("Failed to create order", error);

            // Show specific validation errors if available
            if (error.response?.data?.errors) {
                const errorMessages = error.response.data.errors.map(err => err.msg).join(', ');
                toast.error(`Validation errors: ${errorMessages}`);
            } else if (error.response?.data?.error) {
                toast.error(`Error: ${error.response.data.error}`);
            } else {
                toast.error("Failed to create order");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const loadClients = async () => {
        setIsLoadingClients(true);
        try {
            const data = await clientsApi.getAll();
            setClients(data);
        } catch (error) {
            console.error("Failed to load clients", error);
        } finally {
            setIsLoadingClients(false);
        }
    };

    const filteredClients = clients.filter(client =>
        (client.first_name + ' ' + client.last_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.phone || '').includes(searchQuery)
    );

    const handleClientSelect = (client) => {
        setSelectedClient(client);

        if (client.measurements && useLastRecorded) {
            const clientMeasurements = typeof client.measurements === 'string' ? JSON.parse(client.measurements) : client.measurements;
            const categoryMap = {
                'suit': 'suit',
                'dress': 'body',
                'shirt': 'shirt'
            };
            const category = categoryMap[garmentType];
            const garmentMeasurements = clientMeasurements?.[category] || {};
            setMeasurementValues(garmentMeasurements);
        } else {
            setMeasurementValues({});
        }
    };

    const handleGarmentTypeChange = (type) => {
        setGarmentType(type);
        setMeasurementValues({});
    };

    const handleQuickClientChange = (field, value) => {
        setQuickClient(prev => ({ ...prev, [field]: value }));
        // Clear selected client if typing in quick add
        if (selectedClient) setSelectedClient(null);
    }

    const handleToggleUseLastRecorded = () => {
        setUseLastRecorded(!useLastRecorded);
        // Logic to re-populate measurements would go here
    };

    if (!isOpen) return null;

    const steps = [
        { number: 1, label: <TranslatedText text="Client Details" /> },
        { number: 2, label: <TranslatedText text="Design & Measurements" /> },
        { number: 3, label: <TranslatedText text="Fabric Selection" /> },
        { number: 4, label: <TranslatedText text="Review & Confirm" /> },
        { number: 5, label: <TranslatedText text="Payment" /> },
    ];

    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 5));
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#f6f6f8] dark:bg-[#111421] rounded-2xl w-full max-w-6xl h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 font-sans">
                {/* Close on backdrop click */}
                <div className="absolute inset-0 -z-10" onClick={onClose}></div>
                {/* Header */}
                <header className="flex items-center justify-between border-b border-[#e7e9f3] dark:border-[#2d324a] px-8 py-5 bg-white/80 dark:bg-[#111421]/80 backdrop-blur-lg shrink-0 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        {currentStep > 1 && currentStep < 5 ? (
                            <button onClick={prevStep} className="p-2.5 hover:bg-[#e7e9f3] dark:hover:bg-[#1e2336] rounded-full text-[#4e5a97] transition-all hover:scale-110 active:scale-95" title="Go back">
                                <MaterialIcon name="arrow_back" />
                            </button>
                        ) : (
                            <button onClick={onClose} className="p-2.5 hover:bg-[#e7e9f3] dark:hover:bg-[#1e2336] rounded-full text-[#4e5a97] transition-all hover:scale-110 active:scale-95" title="Close">
                                <MaterialIcon name="close" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-[#0e101b] dark:text-white text-xl font-bold">New Custom Order</h2>
                            <p className="text-xs text-[#4e5a97] dark:text-[#8a95c9] mt-0.5">Step {currentStep} of 4</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium text-green-700 dark:text-green-400"><TranslatedText text="Auto-saved" /></span>
                        </div>
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[#4e5a97] hover:bg-[#e7e9f3] dark:hover:bg-[#1e2336] rounded-lg transition-all hover:scale-105 active:scale-95"><TranslatedText text="Save & Exit" /></button>
                    </div>
                </header>

                {/* Stepper */}
                <div className="px-8 py-6 shrink-0 bg-gradient-to-b from-white/50 to-transparent dark:from-[#111421]/50">
                    <div className="mb-8 max-w-5xl mx-auto w-full">
                        <div className="flex items-center justify-between relative">
                            {/* Progress bar background */}
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-[#e7e9f3] dark:bg-[#2d324a] -z-10 -translate-y-1/2 rounded-full"></div>
                            {/* Active progress bar */}
                            <div
                                className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-600 to-blue-700 -z-10 -translate-y-1/2 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                            ></div>
                            {steps.slice(0, 4).map((step) => {
                                const isActive = currentStep === step.number;
                                const isCompleted = currentStep > step.number;
                                // Styles based on active/completed state matching the requested design
                                const circleClass = isActive || isCompleted
                                    ? "bg-blue-700 border-blue-700 text-white" // Primary color roughly #1430b8 = blue-700/800
                                    : "bg-white dark:bg-[#111421] border-slate-200 dark:border-slate-700 text-slate-400";
                                const textClass = isActive || isCompleted
                                    ? "text-blue-700"
                                    : "text-slate-400 dark:text-slate-500";

                                return (
                                    <div key={step.number} className="flex flex-col items-center gap-2 bg-[#f6f6f8] dark:bg-[#111421] px-4 transition-all duration-300">
                                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all duration-300 ${circleClass} ${isActive ? 'scale-110 shadow-lg shadow-blue-700/30' : ''}`}>
                                            {isCompleted ? <MaterialIcon name="check" className="text-sm" /> : step.number}
                                        </div>
                                        <span className={`text-xs font-bold transition-all duration-300 ${textClass} ${isActive ? 'scale-105' : ''}`}>{step.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 max-w-5xl mx-auto w-full scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">

                    {/* Step 1: Client Details */}
                    {currentStep === 1 && (
                        <div className="grid grid-cols-12 gap-8 animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
                                {/* Select Client Panel */}
                                <div className="bg-white dark:bg-[#1a1e2e] p-6 rounded-xl border border-[#e7e9f3] dark:border-[#2d324a] shadow-sm">
                                    <h3 className="text-base font-bold text-[#0e101b] dark:text-white mb-4"><TranslatedText text="Select Client" /></h3>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4e5a97]">
                                            <MaterialIcon name="search" />
                                        </span>
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#e7e9f3] dark:border-[#2d324a] bg-gray-50 dark:bg-[#111421] text-sm focus:ring-2 focus:ring-blue-700/50 focus:border-blue-700 transition-all outline-none"
                                            placeholder={tSync('Search by name, email or phone...')}
                                            type="text"
                                        />
                                    </div>
                                    <div className="mt-4 flex flex-col gap-2">
                                        <p className="text-[10px] font-bold text-[#4e5a97] dark:text-[#8a95c9] uppercase tracking-wider"><TranslatedText text="RECENTLY ADDED" /></p>
                                        <div className="flex flex-col border border-dashed border-[#e7e9f3] dark:border-[#2d324a] rounded-lg max-h-60 overflow-y-auto custom-scrollbar">
                                            {isLoadingClients ? (
                                                <div className="p-4 text-center text-xs text-gray-500"><TranslatedText text="Loading clients..." /></div>
                                            ) : filteredClients.length > 0 ? (
                                                filteredClients.slice(0, 5).map(client => (
                                                    <button
                                                        key={client.id}
                                                        onClick={() => handleClientSelect(client)}
                                                        className={`flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-[#2d324a] transition-colors border-b border-[#e7e9f3] dark:border-[#2d324a] last:border-0 text-left ${selectedClient?.id === client.id ? 'bg-blue-50/50' : ''}`}
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold uppercase">
                                                            {client.first_name?.[0]}{client.last_name?.[0]}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold text-[#0e101b] dark:text-white">{client.first_name} {client.last_name}</p>
                                                            <p className="text-[11px] text-[#4e5a97] dark:text-[#8a95c9]">{client.email} • {client.phone}</p>
                                                        </div>
                                                        {selectedClient?.id === client.id && (
                                                            <span className="text-blue-700">
                                                                <MaterialIcon name="check_circle" />
                                                            </span>
                                                        )}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-xs text-gray-500"><TranslatedText text="No clients found." /></div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Add New Client Panel */}
                                <div className="bg-white dark:bg-[#1a1e2e] p-6 rounded-xl border border-[#e7e9f3] dark:border-[#2d324a] shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-base font-bold text-[#0e101b] dark:text-white"><TranslatedText text="Quick Add New Client" /></h3>
                                        <span className="text-[10px] font-medium text-blue-700 bg-blue-700/10 px-2 py-0.5 rounded-full"><TranslatedText text="NEW ACCOUNT" /></span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-[#4e5a97] dark:text-[#8a95c9] mb-1.5 uppercase tracking-tighter"><TranslatedText text="FULL NAME" /></label>
                                            <input
                                                value={quickClient.fullName}
                                                onChange={(e) => handleQuickClientChange('fullName', e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-[#e7e9f3] dark:border-[#2d324a] bg-transparent text-sm focus:ring-2 focus:ring-blue-700 outline-none"
                                                placeholder={tSync('Enter full name')}
                                                type="text"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-[#4e5a97] dark:text-[#8a95c9] mb-1.5 uppercase tracking-tighter"><TranslatedText text="PHONE NUMBER" /></label>
                                            <input
                                                value={quickClient.phone}
                                                onChange={(e) => handleQuickClientChange('phone', e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-[#e7e9f3] dark:border-[#2d324a] bg-transparent text-sm focus:ring-2 focus:ring-blue-700 outline-none"
                                                placeholder={tSync('Enter phone number')}
                                                type="tel"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-[#4e5a97] dark:text-[#8a95c9] mb-1.5 uppercase tracking-tighter"><TranslatedText text="EMAIL ADDRESS" /></label>
                                            <input
                                                value={quickClient.email}
                                                onChange={(e) => handleQuickClientChange('email', e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-[#e7e9f3] dark:border-[#2d324a] bg-transparent text-sm focus:ring-2 focus:ring-blue-700 outline-none"
                                                placeholder={tSync('Enter email address')}
                                                type="email"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
                                {/* Order Parameters Panel */}
                                <div className="bg-white dark:bg-[#1a1e2e] p-6 rounded-xl border border-[#e7e9f3] dark:border-[#2d324a] shadow-sm">
                                    <h3 className="text-base font-bold text-[#0e101b] dark:text-white mb-6"><TranslatedText text="Order Parameters" /></h3>
                                    <div className="flex flex-col gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-[#4e5a97] dark:text-[#8a95c9] mb-2 uppercase tracking-tighter"><TranslatedText text="TARGET COMPLETION DATE" /></label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4e5a97]">
                                                    <MaterialIcon name="calendar_today" />
                                                </span>
                                                <input
                                                    value={targetDate}
                                                    onChange={(e) => setTargetDate(e.target.value)}
                                                    className="w-full pl-10 px-3 py-2 rounded-lg border border-[#e7e9f3] dark:border-[#2d324a] bg-transparent text-sm focus:ring-2 focus:ring-blue-700 outline-none"
                                                    type="date"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[#4e5a97] dark:text-[#8a95c9] mb-2 uppercase tracking-tighter"><TranslatedText text="ORDER PRIORITY" /></label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <label onClick={() => setOrderPriority("Standard")} className={`relative flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer ${orderPriority === 'Standard' ? 'border-blue-700 bg-blue-700/5' : 'border-[#e7e9f3] dark:border-[#2d324a]'}`}>
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-sm font-bold ${orderPriority === 'Standard' ? 'text-blue-700' : 'text-gray-500'}`}><TranslatedText text="Standard" /></span>
                                                        <span className="text-[10px] text-gray-400">4-6 Weeks</span>
                                                    </div>
                                                </label>
                                                <label onClick={() => setOrderPriority("Urgent")} className={`relative flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer hover:border-red-200 ${orderPriority === 'Urgent' ? 'border-red-500 bg-red-50' : 'border-[#e7e9f3] dark:border-[#2d324a]'}`}>
                                                    <div className="flex flex-col items-center">
                                                        <span className={`text-sm font-bold ${orderPriority === 'Urgent' ? 'text-red-600' : 'text-gray-500'}`}><TranslatedText text="Urgent" /></span>
                                                        <span className="text-[10px] text-red-400">10-14 Days</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[#4e5a97] dark:text-[#8a95c9] mb-2 uppercase tracking-tighter"><TranslatedText text="ASSIGNED RECEPTIONIST" /></label>
                                            <select
                                                value={assignedReceptionist}
                                                onChange={(e) => setAssignedReceptionist(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-[#e7e9f3] dark:border-[#2d324a] bg-transparent text-sm focus:ring-2 focus:ring-blue-700 outline-none"
                                            >
                                                <option>Elena Gilbert (Current)</option>
                                                <option>Marcus Sterling</option>
                                                <option>Sophia Rossi</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Info Panel */}
                                <div className="bg-gray-50 dark:bg-[#111421] p-5 rounded-xl border border-dashed border-[#e7e9f3] dark:border-[#2d324a]">
                                    <div className="flex items-start gap-3">
                                        <span className="text-blue-700 mt-0.5">
                                            <MaterialIcon name="info" />
                                        </span>
                                        <div>
                                            <p className="text-xs font-semibold text-[#0e101b] dark:text-white"><TranslatedText text="Next Step: Design & Measurements" /></p>
                                            <p className="text-[11px] text-[#4e5a97] dark:text-[#8a95c9] mt-1 leading-relaxed"><TranslatedText text="Proceed to select the garment type and enter customer measurements." /></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Design & Measurements */}
                    {currentStep === 2 && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right-4 fade-in duration-300 items-start">
                            {/* Left Panel: Design Specs (40%) */}
                            <div className="lg:col-span-5 flex flex-col gap-6 bg-white dark:bg-[#1a1e2e] p-6 rounded-xl border border-[#e7e9f3] dark:border-[#2d324a] shadow-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-blue-700">
                                        <MaterialIcon name="palette" />
                                    </span>
                                    <h2 className="text-[#0e101b] dark:text-white text-[20px] font-bold leading-tight">{tSync('Design Specifications')}</h2>
                                </div>

                                {/* Garment Selector */}
                                <div className="flex flex-col gap-3">
                                    <label className="text-sm font-semibold text-[#4e5a97] dark:text-gray-400">{tSync('Select Garment Type')}</label>
                                    <div className="flex h-12 w-full items-center justify-center rounded-lg bg-[#f0f2f9] dark:bg-[#111421] p-1">
                                        {['suit', 'dress', 'shirt'].map(type => (
                                            <label key={type} className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-sm font-semibold transition-all ${garmentType === type ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-700' : 'text-[#4e5a97] dark:text-gray-400'}`}>
                                                <span className="flex items-center gap-2 capitalize">
                                                    <MaterialIcon name={type === 'suit' ? 'checkroom' : type === 'dress' ? 'styler' : 'apparel'} className="text-lg" />
                                                    {type}
                                                </span>
                                                <input
                                                    type="radio"
                                                    name="garment-type"
                                                    value={type}
                                                    checked={garmentType === type}
                                                    onChange={() => handleGarmentTypeChange(type)}
                                                    className="invisible w-0"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Reference Upload */}
                                <div className="flex flex-col gap-3">
                                    <label className="text-sm font-semibold text-[#4e5a97] dark:text-gray-400">{tSync('Reference Images / Sketches')}</label>
                                    <div className="border-2 border-dashed border-[#d0d4e7] dark:border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-[#f8f9fc] dark:bg-gray-800/50 hover:bg-[#f0f2f9] dark:hover:bg-gray-800 transition-colors cursor-pointer group">
                                        <div className="size-12 rounded-full bg-blue-700/10 flex items-center justify-center text-blue-700 group-hover:scale-110 transition-transform">
                                            <MaterialIcon name="cloud_upload" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-[#0e101b] dark:text-white">{tSync('Click to upload or drag and drop')}</p>
                                            <p className="text-xs text-[#4e5a97] dark:text-gray-400 mt-1">{tSync('SVG, PNG, JPG or GIF (max. 5MB)')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Design Notes */}
                                <div className="flex flex-col gap-3">
                                    <label className="text-sm font-semibold text-[#4e5a97] dark:text-gray-400" htmlFor="design-notes">{tSync('Special Design Notes')}</label>
                                    <textarea
                                        className="w-full rounded-lg border border-[#e7e9f3] dark:border-[#2d324a] bg-white dark:bg-[#1a1e2e] text-sm focus:border-blue-700 focus:ring-1 focus:ring-blue-700 dark:text-white p-3 outline-none"
                                        id="design-notes"
                                        placeholder={tSync('Enter any specific design requirements, modifications, or special instructions here...')}
                                        rows="4"
                                        value={orderDescription} // Reusing orderDescription state
                                        onChange={(e) => setOrderDescription(e.target.value)}
                                    ></textarea>
                                </div>
                            </div>

                            {/* Right Panel: Measurements (60%) */}
                            <div className="lg:col-span-7 flex flex-col gap-6 bg-white dark:bg-[#1a1e2e] p-6 rounded-xl border border-[#e7e9f3] dark:border-[#2d324a] shadow-sm">
                                <div className="flex items-center justify-between pb-2 border-b border-[#e7e9f3] dark:border-[#2d324a]">
                                    <div className="flex items-center gap-2">
                                        <span className="text-blue-700">
                                            <MaterialIcon name="architecture" />
                                        </span>
                                        <h2 className="text-[#0e101b] dark:text-white text-[20px] font-bold leading-tight">{tSync('Measurement Profile')}</h2>
                                    </div>
                                    {/* Toggle Use Last */}
                                    <div className="flex items-center gap-3 bg-[#f0f2f9] dark:bg-[#111421] px-3 py-2 rounded-lg">
                                        <span className="text-xs font-semibold text-[#4e5a97] dark:text-gray-400">{tSync('Use Last Recorded')}</span>
                                        <button
                                            onClick={handleToggleUseLastRecorded}
                                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${useLastRecorded ? 'bg-blue-700' : 'bg-gray-300'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useLastRecorded ? 'translate-x-5' : 'translate-x-1'}`}></span>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                                    {measurementFields[garmentType].map((field) => (
                                        <div key={field.key} className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-[#4e5a97] dark:text-gray-400">
                                                {field.label}
                                            </label>
                                            <input
                                                value={measurementValues[field.key] || ''}
                                                onChange={(e) => setMeasurementValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                className="w-full rounded-lg border border-[#e7e9f3] dark:border-[#2d324a] bg-white dark:bg-[#1a1e2e] px-3 py-2 text-base font-medium focus:border-blue-700 focus:ring-1 focus:ring-blue-700 dark:text-white outline-none"
                                                type="number"
                                                step="0.1"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Measurement Reference Image/Diagram */}
                                <div className="mt-4 p-4 rounded-xl bg-blue-700/5 border border-blue-700/10 flex items-center gap-6">
                                    <div className="size-24 bg-white rounded-lg flex items-center justify-center p-2 shadow-sm shrink-0 overflow-hidden">
                                        <div className="flex flex-col items-center justify-center text-gray-300 h-full w-full">
                                            <MaterialIcon name="accessibility_new" className="text-4xl" />
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-blue-700">{tSync('Need Help Measuring?')}</h4>
                                        <p className="text-xs text-[#4e5a97] dark:text-gray-400 mt-1">{tSync('Our guide shows exactly where to measure for the perfect fit.')}</p>
                                        <button className="text-xs font-bold text-blue-700 mt-2 flex items-center gap-1 hover:underline">
                                            <MaterialIcon name="play_circle" className="text-sm" /> {tSync('View Measurement Guide')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Fabric Selection */}
                    {currentStep === 3 && (
                        <div className="grid grid-cols-12 gap-6 h-full">
                            {/* Left Panel: Inventory Catalog */}
                            <div className="col-span-12 lg:col-span-7 flex flex-col bg-white dark:bg-[#1a1e2e] rounded-xl border border-[#e7e9f3] dark:border-[#2d324a] shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-[#e7e9f3] dark:border-[#2d324a]">
                                    <h3 className="text-lg font-bold text-[#0e101b] dark:text-white">{tSync('Material Catalog')}</h3>

                                    {/* Search and Filter */}
                                    <div className="flex gap-3 mt-4">
                                        <div className="flex-1 relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4e5a97]">
                                                <MaterialIcon name="search" />
                                            </span>
                                            <input
                                                type="text"
                                                placeholder={tSync('Search fabrics, buttons, zippers...')}
                                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#e7e9f3] dark:border-[#2d324a] bg-gray-50 dark:bg-[#111421] text-sm focus:ring-2 focus:ring-blue-700/50 focus:border-blue-700 transition-all outline-none"
                                            />
                                        </div>
                                        <button className="px-4 py-2 rounded-lg border border-[#e7e9f3] dark:border-[#2d324a] text-sm font-medium text-[#4e5a97] hover:bg-gray-50 dark:hover:bg-[#2d324a] flex items-center gap-2">
                                            <MaterialIcon name="tune" />
                                            {tSync('Filters')}
                                        </button>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex gap-1 mt-4 border-b border-[#e7e9f3] dark:border-[#2d324a]">
                                        {[
                                            { label: tSync('Fabric'), value: 'fabric' },
                                            { label: tSync('Buttons'), value: 'buttons' },
                                            { label: tSync('Zippers'), value: 'zippers' },
                                            { label: tSync('Thread'), value: 'thread' }
                                        ].map((tab) => (
                                            <button
                                                key={tab.value}
                                                onClick={() => setSelectedMaterialTab(tab.value)}
                                                className={`px-4 py-2 text-sm font-semibold transition-colors ${selectedMaterialTab === tab.value
                                                    ? 'text-blue-700 border-b-2 border-blue-700'
                                                    : 'text-[#4e5a97] dark:text-gray-400 hover:text-blue-700'
                                                    }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Catalog Grid */}
                                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto flex-1">
                                    {isLoadingInventory ? (
                                        <div className="col-span-3 flex items-center justify-center py-20">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
                                        </div>
                                    ) : inventoryItems.filter(item => item.type === selectedMaterialTab || item.itemType === selectedMaterialTab).length > 0 ? (
                                        inventoryItems.filter(item => item.type === selectedMaterialTab || item.itemType === selectedMaterialTab).map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => handleAddToOrder(item)}
                                                className="border border-[#e7e9f3] dark:border-[#2d324a] rounded-lg overflow-hidden cursor-pointer hover:shadow-lg hover:border-blue-700 transition-all group"
                                            >
                                                {/* Image */}
                                                <div className="h-32 bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                                                    {item.imageUrl ? (
                                                        <img src={item.imageUrl} alt={item.itemName || item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                            <MaterialIcon name="texture" className="text-4xl" />
                                                        </div>
                                                    )}
                                                    {/* Stock Badge */}
                                                    {(item.quantityAvailable || item.current_stock || 0) < 10 && (
                                                        <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
                                                            {tSync('Low Stock')}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Details */}
                                                <div className="p-3">
                                                    <h4 className="font-bold text-sm text-[#0e101b] dark:text-white truncate">{item.itemName || item.name}</h4>
                                                    <p className="text-xs text-[#4e5a97] dark:text-gray-400 mt-1">
                                                        {item.supplier_name || tSync('No Supplier')} • SKU: {item.sku || 'N/A'}
                                                    </p>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className="text-xs text-green-600 font-medium">
                                                            {tSync('Available')}: {item.quantityAvailable || item.current_stock || 0} {item.unitOfMeasure || item.unit || 'm'}
                                                        </span>
                                                        <span className="text-sm font-bold text-blue-700">
                                                            ${((item.sellingPrice || item.selling_price || item.cost_per_unit * 1.5) || 0).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-3 flex flex-col items-center justify-center py-20 text-gray-400">
                                            <MaterialIcon name="inventory_2" className="text-5xl mb-3" />
                                            <p className="text-sm font-semibold">{tSync('No items found', { type: selectedMaterialTab })}</p>
                                            <p className="text-xs mt-2">{tSync('Try a different search or category')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Panel: Selected Items */}
                            <div className="col-span-12 lg:col-span-5 flex flex-col bg-white dark:bg-[#1a1e2e] rounded-xl border border-[#e7e9f3] dark:border-[#2d324a] shadow-sm">
                                <div className="p-6 border-b border-[#e7e9f3] dark:border-[#2d324a]">
                                    <h3 className="text-lg font-bold text-[#0e101b] dark:text-white">{tSync('Selected Materials')}</h3>
                                    <p className="text-xs text-blue-700 font-semibold mt-1">{tSync('{count} items selected', { count: selectedOrderItems.length })}</p>
                                </div>

                                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                                    {selectedOrderItems.length > 0 ? (
                                        selectedOrderItems.map((item) => (
                                            <div key={item.inventoryItemId} className="border border-[#e7e9f3] dark:border-[#2d324a] rounded-lg p-4 relative">
                                                {/* Remove Button */}
                                                <button
                                                    onClick={() => handleRemoveItem(item.inventoryItemId)}
                                                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <MaterialIcon name="close" />
                                                </button>

                                                {/* Item Info */}
                                                <div className="flex gap-3 mb-3">
                                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center shrink-0">
                                                        {item.image ? (
                                                            <img src={item.image} alt={item.description} className="w-full h-full object-cover rounded" />
                                                        ) : (
                                                            <MaterialIcon name="texture" className="text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-sm text-[#0e101b] dark:text-white truncate">{item.description}</h4>
                                                        <p className="text-xs text-[#4e5a97] dark:text-gray-400">Inventory: {item.available} {item.unitOfMeasure} available</p>
                                                    </div>
                                                </div>

                                                {/* Quantity Input */}
                                                <div>
                                                    <label className="block text-xs font-bold text-[#4e5a97] dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                                                        {tSync('selection.quantityRequired')} ({item.unitOfMeasure})
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={item.quantity}
                                                        onChange={(e) => handleUpdateQuantity(item.inventoryItemId, parseFloat(e.target.value) || 0)}
                                                        className="w-full px-3 py-2 rounded-lg border border-[#e7e9f3] dark:border-[#2d324a] bg-white dark:bg-[#1a1e2e] text-base font-medium focus:border-blue-700 focus:ring-1 focus:ring-blue-700 dark:text-white outline-none"
                                                    />
                                                    {item.quantity > item.available && (
                                                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                                            <MaterialIcon name="error" className="text-sm" />
                                                            {tSync('selection.exceedsStock')}
                                                        </p>
                                                    )}
                                                    {item.quantity <= item.available && (
                                                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                                            <MaterialIcon name="check_circle" className="text-sm" />
                                                            {tSync('selection.inStock')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                            <MaterialIcon name="shopping_bag" className="text-5xl mb-3" />
                                            <p className="text-sm">{tSync('selection.noSelected')}</p>
                                            <p className="text-xs mt-1">{tSync('selection.clickToAdd')}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer with Total */}
                                <div className="p-6 border-t border-[#e7e9f3] dark:border-[#2d324a] bg-gray-50 dark:bg-[#111421] space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#4e5a97] dark:text-gray-400">{tSync('selection.subtotal')}</span>
                                        <span className="font-semibold text-[#0e101b] dark:text-white">
                                            ${selectedOrderItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-base pt-2 border-t border-[#e7e9f3] dark:border-[#2d324a]">
                                        <span className="font-bold text-[#0e101b] dark:text-white">{tSync('selection.estimatedCost')}</span>
                                        <span className="font-bold text-blue-700 text-lg">
                                            ${selectedOrderItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Review & Confirm */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            {/* Top Grid: Client Summary and Design & Measurements */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Client Summary */}
                                <div className="bg-white dark:bg-[#1a1e2e] p-6 rounded-xl border border-[#e7e9f3] dark:border-[#2d324a] shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <MaterialIcon name="person" className="text-blue-700" />
                                            <h3 className="text-lg font-bold text-[#0e101b] dark:text-white">{tSync('review.clientSummary')}</h3>
                                        </div>
                                        <button className="text-blue-700 text-sm font-semibold flex items-center gap-1 hover:underline">
                                            <MaterialIcon name="edit" className="text-sm" />
                                            {tSync('actions.edit')}
                                        </button>
                                    </div>

                                    {/* Client Info */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-lg font-bold uppercase shrink-0">
                                            {selectedClient ? `${selectedClient.first_name?.[0]}${selectedClient.last_name?.[0]}` : quickClient.fullName?.[0] || 'U'}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-[#0e101b] dark:text-white">
                                                {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : quickClient.fullName || 'Unknown Client'}
                                            </h4>
                                            <p className="text-sm text-[#4e5a97] dark:text-gray-400 mt-1">
                                                {selectedClient?.email || quickClient.email || 'No email'}
                                            </p>
                                            <p className="text-sm text-[#4e5a97] dark:text-gray-400">
                                                {selectedClient?.phone || quickClient.phone || 'No phone'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Billing Address */}
                                    {selectedClient?.address && (
                                        <div className="mt-4 pt-4 border-t border-[#e7e9f3] dark:border-[#2d324a]">
                                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">{tSync('review.billingAddress')}</p>
                                            <p className="text-sm text-[#0e101b] dark:text-white">{selectedClient.address}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Design & Measurements */}
                                <div className="bg-white dark:bg-[#1a1e2e] p-6 rounded-xl border border-[#e7e9f3] dark:border-[#2d324a] shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <MaterialIcon name="straighten" className="text-blue-700" />
                                            <h3 className="text-lg font-bold text-[#0e101b] dark:text-white">{tSync('review.designMeasurements')}</h3>
                                        </div>
                                        <button className="text-blue-700 text-sm font-semibold flex items-center gap-1 hover:underline">
                                            <MaterialIcon name="edit" className="text-sm" />
                                            {tSync('actions.edit')}
                                        </button>
                                    </div>

                                    {/* Garment Type */}
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-bold text-[#0e101b] dark:text-white capitalize">Navy 3-Piece {garmentType}</h4>
                                        <span className="text-xs font-bold text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">BESPOKE SLIM FIT</span>
                                    </div>

                                    {/* Measurements Grid */}
                                    <div className="grid grid-cols-3 gap-4">
                                        {measurementFields[garmentType].slice(0, 6).map((field) => (
                                            <div key={field.key} className="text-center">
                                                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">{field.shortLabel}</p>
                                                <p className="text-lg font-bold text-[#0e101b] dark:text-white mt-1">
                                                    {measurementValues[field.key] || '--'} cm
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Grid: Materials Summary and Production Details */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Materials Summary */}
                                <div className="bg-white dark:bg-[#1a1e2e] p-6 rounded-xl border border-[#e7e9f3] dark:border-[#2d324a] shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <MaterialIcon name="inventory_2" className="text-blue-700" />
                                            <h3 className="text-lg font-bold text-[#0e101b] dark:text-white">{tSync('review.materialsSummary')}</h3>
                                        </div>
                                        <button className="text-blue-700 text-sm font-semibold flex items-center gap-1 hover:underline">
                                            <MaterialIcon name="edit" className="text-sm" />
                                            {tSync('actions.edit')}
                                        </button>
                                    </div>

                                    {/* Materials List */}
                                    <div className="space-y-3">
                                        {selectedOrderItems.map((item) => (
                                            <div key={item.inventoryItemId} className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center shrink-0">
                                                    {item.image ? (
                                                        <img src={item.image} alt={item.description} className="w-full h-full object-cover rounded" />
                                                    ) : (
                                                        <MaterialIcon name="texture" className="text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-sm text-[#0e101b] dark:text-white truncate">{item.description}</h4>
                                                    <p className="text-xs text-[#4e5a97] dark:text-gray-400">
                                                        {item.quantity}{item.unitOfMeasure} x ${item.unitPrice.toFixed(2)}/{item.unitOfMeasure}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-[#0e101b] dark:text-white">${(item.quantity * item.unitPrice).toFixed(2)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Materials Subtotal */}
                                    <div className="mt-4 pt-4 border-t border-[#e7e9f3] dark:border-[#2d324a] flex justify-between">
                                        <span className="font-bold text-blue-700">{tSync('review.materialsSubtotal')}</span>
                                        <span className="font-bold text-blue-700 text-lg">${materialCost.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Production Details */}
                                <div className="bg-white dark:bg-[#1a1e2e] p-6 rounded-xl border border-[#e7e9f3] dark:border-[#2d324a] shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <MaterialIcon name="engineering" className="text-blue-700" />
                                        <h3 className="text-lg font-bold text-[#0e101b] dark:text-white">{tSync('review.productionDetails')}</h3>
                                    </div>

                                    {/* Assigned Tailor */}
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">{tSync('review.assignedTailor')}</label>
                                        <select
                                            value={selectedTailorId}
                                            onChange={(e) => setSelectedTailorId(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-[#e7e9f3] dark:border-[#2d324a] bg-white dark:bg-[#1a1e2e] text-sm focus:ring-2 focus:ring-blue-700 outline-none"
                                        >
                                            <option value="">{tSync('review.selectTailor')}</option>
                                            {tailors.map((tailor) => (
                                                <option key={tailor.id} value={tailor.id}>
                                                    {tailor.first_name} {tailor.last_name} ({tailor.role?.roleName || 'Tailor'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* First Fitting Date */}
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">First Fitting Date</label>
                                        <input
                                            type="date"
                                            value={targetDate}
                                            onChange={(e) => setTargetDate(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-[#e7e9f3] dark:border-[#2d324a] bg-white dark:bg-[#1a1e2e] text-sm focus:ring-2 focus:ring-blue-700 outline-none"
                                        />
                                    </div>

                                    {/* Estimated Completion */}
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-2">
                                        <MaterialIcon name="info" className="text-blue-700 text-sm mt-0.5" />
                                        <div>
                                            <p className="text-xs font-semibold text-blue-700">
                                                Estimated completion date for this order is 24th Nov 2024, subject to fitting results.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Order Total Breakdown */}
                            <div className="bg-white dark:bg-[#1a1e2e] p-6 rounded-xl border border-[#e7e9f3] dark:border-[#2d324a] shadow-sm">
                                <h3 className="text-lg font-bold text-[#0e101b] dark:text-white mb-4">Order Total Breakdown</h3>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#4e5a97] dark:text-gray-400">Material Costs</span>
                                        <span className="font-semibold text-[#0e101b] dark:text-white">${materialCost.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-[#4e5a97] dark:text-gray-400">Making Service Cost</span>
                                            <span className="text-[10px] text-gray-400 italic">Labor only (excludes materials)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[#0e101b] dark:text-white font-medium">$</span>
                                            <input
                                                type="number"
                                                value={laborCost}
                                                onChange={(e) => setLaborCost(Number(e.target.value))}
                                                className="w-24 text-right px-2 py-1 rounded border border-[#e7e9f3] dark:border-[#2d324a] font-semibold text-[#0e101b] dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#4e5a97] dark:text-gray-400">Tax (20%)</span>
                                        <span className="font-semibold text-[#0e101b] dark:text-white">${taxAmount.toFixed(2)}</span>
                                    </div>

                                    <div className="pt-3 border-t border-[#e7e9f3] dark:border-[#2d324a] flex justify-between items-center">
                                        <span className="text-lg font-bold text-[#0e101b] dark:text-white">Total Amount</span>
                                        <span className="text-3xl font-bold text-blue-700">${totalOrderCost.toFixed(2)}</span>
                                    </div>

                                    {/* Required Deposit */}
                                    <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MaterialIcon name="payments" className="text-orange-600" />
                                            <div className="flex flex-col">
                                                <span className="font-bold text-orange-600">REQUIRED DEPOSIT (Materials)</span>
                                                <span className="text-xs text-orange-600/80">Client pays labor upon pickup</span>
                                            </div>
                                        </div>
                                        <span className="text-xl font-bold text-orange-600">${materialCost.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Success (Preserved) */}
                    {currentStep === 5 && (
                        <div className="flex flex-col items-center justify-center text-center p-10">
                            <div className="size-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                                <MaterialIcon name="check_circle" className="text-green-600 text-5xl" />
                            </div>
                            <h2 className="text-3xl font-bold mb-2">Order #{createdOrderNumber} Created!</h2>
                            <button onClick={onClose} className="mt-8 px-6 py-3 bg-blue-700 text-white rounded-lg font-bold shadow-lg">
                                Return to Dashboard
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#e7e9f3] dark:border-[#2d324a] bg-[#f6f6f8] dark:bg-[#111421] flex justify-end">
                    {/* Only show Next button in footer for consistency with design, back button can be added if needed but user design showed right aligned Next button */}
                    {currentStep > 1 && currentStep < 5 && (
                        <button onClick={prevStep} className="mr-auto px-6 py-3 rounded-lg text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#1e2336] transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                            <MaterialIcon name="arrow_back" className="text-lg" />
                            Back
                        </button>
                    )}

                    <button
                        onClick={currentStep === 4 ? handleSubmitOrder : (currentStep === 5 ? onClose : nextStep)}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-700/30 hover:shadow-xl hover:shadow-blue-700/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {isSubmitting ? 'Processing...' : (
                            <>
                                {currentStep === 4 ? 'Confirm & Create' : currentStep === 5 ? 'Close' : `Next: ${steps[currentStep].label}`}
                                {currentStep !== 5 && <MaterialIcon name="arrow_forward" />}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
