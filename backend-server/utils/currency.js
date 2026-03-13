/**
 * Formats a number as currency with a symbol
 */
const getCurrencySymbol = (code) => {
    switch (code?.toUpperCase()) {
        case 'USD': return '$';
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'INR': return '₹';
        case 'PKR': return 'Rs';
        case 'AED': return 'د.إ';
        case 'SAR': return '﷼';
        default: return 'Rs'; // Default to Rs
    }
};

module.exports = {
    getCurrencySymbol
};
