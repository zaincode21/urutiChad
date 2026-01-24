export const calculateFabricQuantity = ({ garmentType, measurements, fabricWidth = 140, includeBuffer = true }) => {
    let quantity = 0;
    let breakdown = '';

    // Simplified calculation logic
    if (garmentType === 'suit') {
        // Jacket + Trousers approx logic
        // Jacket uses ~1.5 - 2m, Trousers ~1.2 - 1.5m
        const heightFactor = measurements.jacket_length ? (parseFloat(measurements.jacket_length) / 100) : 0.8;
        quantity = (heightFactor * 2) + 1.5; // Rough estimate: 2 lengths + sleeve/extras
        breakdown = "Suit calc: Jacket + Trousers";
    } else if (garmentType === 'shirt') {
        quantity = 1.5 + (parseFloat(measurements.sleeve_length || 60) / 100) * 0.5;
        breakdown = "Shirt calc: Body + Sleeves";
    } else if (garmentType === 'dress') {
        quantity = 2.5; // Base amount
        breakdown = "Dress base";
    }

    if (includeBuffer) {
        quantity *= 1.1; // 10% buffer
    }

    return {
        quantity: parseFloat(quantity.toFixed(2)),
        breakdown
    };
};

export const formatCalculationResult = (result) => {
    return `${result.quantity}m (${result.breakdown})`;
};
