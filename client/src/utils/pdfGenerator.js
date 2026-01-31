import jsreport from 'jsreport-browser-client-dist';
import { translationService } from '../lib/i18n/translation-service';

// Initialize jsreport client
const jsreportClient = jsreport('http://localhost:5488'); // Adjust URL as needed

export const generateSewingInfoPDF = async (orderData) => {
    try {
        const template = {
            content: getSewingInfoTemplate(),
            engine: 'handlebars',
            recipe: 'chrome-pdf',
            chrome: {
                format: 'A4',
                margin: {
                    top: '1cm',
                    right: '1cm',
                    bottom: '1cm',
                    left: '1cm'
                }
            }
        };

        const data = formatOrderDataForTemplate(orderData);

        const response = await jsreportClient.render({
            template,
            data
        });

        // Create blob and download
        const blob = new Blob([response.content], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sewing-info-${orderData.order_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};

const formatOrderDataForTemplate = (orderData) => {
    // Parse measurements
    let measurements = orderData.measurements;
    if (!measurements && orderData.notes) {
        measurements = {};
        const measurementRegex = /(chest|waist|hip|shoulder|arm|inseam):\s*(\d+)/gi;
        let match;
        while ((match = measurementRegex.exec(orderData.notes)) !== null) {
            const field = match[1].toLowerCase();
            const value = match[2];
            if (field === 'shoulder') {
                measurements.shoulder_width = value;
            } else if (field === 'arm') {
                measurements.arm_length = value;
            } else {
                measurements[field] = value;
            }
        }
    }

    // Default measurements if none found
    if (!measurements || Object.keys(measurements).length === 0) {
        measurements = {
            chest: '95',
            waist: '80',
            hip: '90',
            shoulder_width: '45',
            arm_length: '60',
            inseam: '75'
        };
    }

    return {
        orderNumber: orderData.order_number,
        customerName: `${orderData.first_name} ${orderData.last_name}`,
        customerEmail: orderData.customer_email,
        customerPhone: orderData.customer_phone || 'N/A',
        orderDate: new Date(orderData.created_at).toLocaleDateString(),
        targetDate: orderData.target_date ? new Date(orderData.target_date).toLocaleDateString() : 'TBD',
        status: orderData.status,
        measurements: Object.entries(measurements).map(([key, value]) => ({
            name: translationService.translateSync(key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())),
            value: `${value} cm`
        })),
        items: orderData.items?.map(item => ({
            name: item.product_name,
            quantity: parseFloat(item.quantity).toFixed(2),
            unitPrice: formatCurrency(item.unit_price || item.price || 0),
            totalPrice: formatCurrency(item.total_price || (item.unit_price * item.quantity) || (item.price * item.quantity) || 0)
        })) || [],
        notes: orderData.notes || 'No special instructions provided',
        totalAmount: formatCurrency(orderData.total_amount || 0)
    };
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'CFA',
        minimumFractionDigits: 0,
    }).format(amount || 0);
};

const getSewingInfoTemplate = () => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Customer Sewing Information</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.4;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #2563eb;
            font-size: 28px;
            margin: 0;
            font-weight: bold;
        }
        
        .header .order-number {
            color: #666;
            font-size: 16px;
            margin-top: 5px;
        }
        
        .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .section-title {
            background: #f8fafc;
            border-left: 4px solid #2563eb;
            padding: 10px 15px;
            margin-bottom: 15px;
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 15px;
        }
        
        .info-item {
            border: 1px solid #e5e7eb;
            padding: 12px;
            border-radius: 6px;
            background: #fafafa;
        }
        
        .info-label {
            font-weight: bold;
            color: #374151;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        
        .info-value {
            font-size: 16px;
            color: #111827;
        }
        
        .measurements-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .measurement-item {
            border: 1px solid #d1d5db;
            padding: 10px;
            text-align: center;
            border-radius: 6px;
            background: #f9fafb;
        }
        
        .measurement-name {
            font-weight: bold;
            color: #374151;
            font-size: 12px;
            margin-bottom: 5px;
        }
        
        .measurement-value {
            font-size: 18px;
            color: #1f2937;
            font-weight: bold;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        
        .items-table th,
        .items-table td {
            border: 1px solid #d1d5db;
            padding: 10px;
            text-align: left;
        }
        
        .items-table th {
            background: #f3f4f6;
            font-weight: bold;
            color: #374151;
        }
        
        .items-table tr:nth-child(even) {
            background: #f9fafb;
        }
        
        .notes-box {
            border: 2px solid #fbbf24;
            background: #fef3c7;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        
        .notes-title {
            font-weight: bold;
            color: #92400e;
            margin-bottom: 8px;
        }
        
        .notes-content {
            color: #451a03;
            line-height: 1.5;
        }
        
        .dates-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 20px;
        }
        
        .date-item {
            text-align: center;
            padding: 15px;
            border-radius: 8px;
        }
        
        .date-item.order {
            background: #dbeafe;
            border: 1px solid #3b82f6;
        }
        
        .date-item.target {
            background: #dcfce7;
            border: 1px solid #16a34a;
        }
        
        .date-item.status {
            background: #f3e8ff;
            border: 1px solid #9333ea;
        }
        
        .date-label {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        
        .date-value {
            font-size: 16px;
            font-weight: bold;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
        }
        
        @media print {
            body { margin: 0; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Customer Sewing Information</h1>
        <div class="order-number">Order #{{orderNumber}}</div>
    </div>

    <div class="section">
        <div class="section-title">Customer Information</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Customer Name</div>
                <div class="info-value">{{customerName}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Email Address</div>
                <div class="info-value">{{customerEmail}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Phone Number</div>
                <div class="info-value">{{customerPhone}}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Order Date</div>
                <div class="info-value">{{orderDate}}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Body Measurements</div>
        <div class="measurements-grid">
            {{#each measurements}}
            <div class="measurement-item">
                <div class="measurement-name">{{name}}</div>
                <div class="measurement-value">{{value}}</div>
            </div>
            {{/each}}
        </div>
    </div>

    <div class="section">
        <div class="section-title">Order Items</div>
        <table class="items-table">
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total Price</th>
                </tr>
            </thead>
            <tbody>
                {{#each items}}
                <tr>
                    <td>{{name}}</td>
                    <td>{{quantity}}</td>
                    <td>{{unitPrice}}</td>
                    <td>{{totalPrice}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Special Instructions</div>
        <div class="notes-box">
            <div class="notes-title">Important Notes:</div>
            <div class="notes-content">{{notes}}</div>
        </div>
    </div>

    <div class="dates-grid">
        <div class="date-item order">
            <div class="date-label" style="color: #1e40af;">Order Date</div>
            <div class="date-value" style="color: #1e40af;">{{orderDate}}</div>
        </div>
        <div class="date-item target">
            <div class="date-label" style="color: #15803d;">Target Completion</div>
            <div class="date-value" style="color: #15803d;">{{targetDate}}</div>
        </div>
        <div class="date-item status">
            <div class="date-label" style="color: #7c2d12;">Status</div>
            <div class="date-value" style="color: #7c2d12;">{{status}}</div>
        </div>
    </div>

    <div class="footer">
        <p>Generated on {{orderDate}} | Professional Atelier Services</p>
    </div>
</body>
</html>
`;