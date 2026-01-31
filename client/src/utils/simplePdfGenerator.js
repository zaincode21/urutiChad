import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generateSewingInfoPDF = async (orderData, tSync) => {
  try {
    // Create a temporary div with the PDF content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = getSewingInfoHTML(orderData, tSync);
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm'; // A4 width
    tempDiv.style.padding = '20px';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    
    document.body.appendChild(tempDiv);

    // Convert to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    // Remove temp div
    document.body.removeChild(tempDiv);

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Download the PDF
    pdf.save(`sewing-info-${orderData.order_number}.pdf`);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'CFA',
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

const getSewingInfoHTML = (orderData, tSync) => {
  // Parse measurements
  let measurements = orderData.measurements;
  if (!measurements && orderData.notes) {
    measurements = {};
    const measurementRegex = /(chest|waist|hip|shoulder|arm|inseam):\\s*(\\d+)/gi;
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

  const measurementsHTML = Object.entries(measurements).map(([key, value]) => `
    <div style="border: 1px solid #d1d5db; padding: 10px; text-align: center; border-radius: 6px; background: #f9fafb;">
      <div style="font-weight: bold; color: #374151; font-size: 12px; margin-bottom: 5px;">
        ${key.replace('_', ' ').replace(/\\b\\w/g, l => l.toUpperCase())}
      </div>
      <div style="font-size: 18px; color: #1f2937; font-weight: bold;">${value} cm</div>
    </div>
  `).join('');

  const itemsHTML = orderData.items?.map(item => `
    <tr style="background: #f9fafb;">
      <td style="border: 1px solid #d1d5db; padding: 10px;">${item.product_name}</td>
      <td style="border: 1px solid #d1d5db; padding: 10px; text-align: center;">${parseFloat(item.quantity).toFixed(2)}</td>
      <td style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">
        ${formatCurrency(item.unit_price || item.price || 0)}
      </td>
      <td style="border: 1px solid #d1d5db; padding: 10px; text-align: right; font-weight: bold;">
        ${formatCurrency(item.total_price || (item.unit_price * item.quantity) || (item.price * item.quantity) || 0)}
      </td>
    </tr>
  `).join('') || `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">${tSync('No items found')}</td></tr>`;

  return `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.4; max-width: 800px;">
      <!-- Header -->
      <div style="text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="color: #2563eb; font-size: 28px; margin: 0; font-weight: bold;">${tSync('Customer Sewing Information')}</h1>
        <div style="color: #666; font-size: 16px; margin-top: 5px;">${tSync('Order')} #${orderData.order_number}</div>
      </div>

      <!-- Customer Information -->
      <div style="margin-bottom: 25px;">
        <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 10px 15px; margin-bottom: 15px; font-size: 18px; font-weight: bold; color: #1e40af;">
          ${tSync('Customer Information')}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div style="border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px; background: #fafafa;">
            <div style="font-weight: bold; color: #374151; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">${tSync('Customer Name')}</div>
            <div style="font-size: 16px; color: #111827;">${orderData.first_name} ${orderData.last_name}</div>
          </div>
          <div style="border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px; background: #fafafa;">
            <div style="font-weight: bold; color: #374151; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">${tSync('Email Address')}</div>
            <div style="font-size: 16px; color: #111827;">${orderData.customer_email}</div>
          </div>
          <div style="border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px; background: #fafafa;">
            <div style="font-weight: bold; color: #374151; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">${tSync('Phone Number')}</div>
            <div style="font-size: 16px; color: #111827;">${orderData.customer_phone || 'N/A'}</div>
          </div>
          <div style="border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px; background: #fafafa;">
            <div style="font-weight: bold; color: #374151; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">${tSync('Order Date')}</div>
            <div style="font-size: 16px; color: #111827;">${new Date(orderData.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      <!-- Body Measurements -->
      <div style="margin-bottom: 25px;">
        <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 10px 15px; margin-bottom: 15px; font-size: 18px; font-weight: bold; color: #1e40af;">
          ${tSync('Body Measurements')}
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
          ${measurementsHTML}
        </div>
      </div>

      <!-- Order Items -->
      <div style="margin-bottom: 25px;">
        <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 10px 15px; margin-bottom: 15px; font-size: 18px; font-weight: bold; color: #1e40af;">
          ${tSync('Order Items')}
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; font-weight: bold; color: #374151;">${tSync('Item Name')}</th>
              <th style="border: 1px solid #d1d5db; padding: 10px; text-align: center; font-weight: bold; color: #374151;">${tSync('Quantity')}</th>
              <th style="border: 1px solid #d1d5db; padding: 10px; text-align: right; font-weight: bold; color: #374151;">${tSync('Unit Price')}</th>
              <th style="border: 1px solid #d1d5db; padding: 10px; text-align: right; font-weight: bold; color: #374151;">${tSync('Total Price')}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        <!-- Total Amount -->
        <div style="background: #dbeafe; border: 2px solid #3b82f6; padding: 15px; border-radius: 8px; margin-top: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 18px; font-weight: bold; color: #1e40af;">${tSync('Total Amount')}:</div>
            <div style="font-size: 20px; font-weight: bold; color: #1e40af;">${formatCurrency(orderData.total_amount || 0)}</div>
          </div>
        </div>
      </div>

      <!-- Special Instructions -->
      <div style="margin-bottom: 25px;">
        <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 10px 15px; margin-bottom: 15px; font-size: 18px; font-weight: bold; color: #1e40af;">
          ${tSync('Special Instructions')}
        </div>
        <div style="border: 2px solid #fbbf24; background: #fef3c7; padding: 15px; border-radius: 8px;">
          <div style="font-weight: bold; color: #92400e; margin-bottom: 8px;">${tSync('Important Notes')}:</div>
          <div style="color: #451a03; line-height: 1.5;">${orderData.notes || tSync('No special instructions provided')}</div>
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
        <p>${tSync('Generated on')} ${new Date().toLocaleDateString()} | ${tSync('Professional Atelier Services')}</p>
      </div>
    </div>
  `;
};