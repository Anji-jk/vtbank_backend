import crypto from 'crypto';

export const generateAccountNumber = (customerCode) => {
  const codeStr = String(customerCode);
  const neededDigits = 16 - codeStr.length;

  // If customerCode is already 16 digits or longer
  if (neededDigits <= 0) {
    return codeStr.slice(0, 16);
  }

  // Generate a random integer from 0 up to (10^neededDigits - 1)
  const max = Math.pow(10, neededDigits);
  const randomNum = crypto.randomInt(0, max);

  // Pad with leading zeros to guarantee exact needed length
  const randomDigits = String(randomNum).padStart(neededDigits, '0');

  return `${codeStr}${randomDigits}`;
};