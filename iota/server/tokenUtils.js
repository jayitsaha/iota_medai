/**
 * Token conversion and display utilities
 */

// Constants for token display
const TOKEN_SYMBOL = 'TST'; // Shimmer Testnet token symbol
const TOKEN_DECIMALS = 6;   // 1 TST = 1,000,000 base units

/**
 * Convert from base units to display units
 * @param {number|string} baseAmount - Amount in base units (from blockchain)
 * @returns {number} - Human-readable amount
 */
function baseToDisplay(baseAmount) {
  const amountNum = typeof baseAmount === 'string' ? parseInt(baseAmount, 10) : baseAmount;
  return amountNum / Math.pow(10, TOKEN_DECIMALS);
}

/**
 * Convert from display units to base units
 * @param {number|string} displayAmount - Human-readable amount
 * @returns {number} - Amount in base units (for blockchain)
 */
function displayToBase(displayAmount) {
  const amountNum = typeof displayAmount === 'string' ? parseFloat(displayAmount) : displayAmount;
  return Math.floor(amountNum * Math.pow(10, TOKEN_DECIMALS));
}

/**
 * Format a token amount for display with symbol
 * @param {number} amount - Amount in display units
 * @returns {string} - Formatted amount with symbol
 */
function formatTokenAmount(amount) {
  return `${amount.toLocaleString()} ${TOKEN_SYMBOL}`;
}

// Export the utilities
module.exports = {
  TOKEN_SYMBOL,
  TOKEN_DECIMALS,
  baseToDisplay,
  displayToBase,
  formatTokenAmount
};