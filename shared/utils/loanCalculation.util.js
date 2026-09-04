/**
 * Calculates Reducing Balance EMI and complete schedule
 */
export const calculateEmiDetails = (principal, annualRate, tenureMonths) => {
    const monthlyRate = annualRate / 12 / 100;

    // EMI = [P x R x (1+R)^N]/[(1+R)^N-1]
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1);

    const roundedEmi = Math.round(emi * 100) / 100;
    return roundedEmi;
};

export const generateAmortizationSchedule = (accountNumber, principal, annualRate, tenureMonths, startDate = new Date()) => {
    const monthlyRate = annualRate / 12 / 100;
    const emi = calculateEmiDetails(principal, annualRate, tenureMonths);

    let currentBalance = parseFloat(principal);
    const schedule = [];

    for (let i = 1; i <= tenureMonths; i++) {
        const interestComponent = Math.round((currentBalance * monthlyRate) * 100) / 100;
        let principalComponent = Math.round((emi - interestComponent) * 100) / 100;

        // Adjust final installment rounding drift
        if (i === tenureMonths) {
            principalComponent = currentBalance;
        }

        currentBalance = Math.round((currentBalance - principalComponent) * 100) / 100;
        if (currentBalance < 0) currentBalance = 0;

        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        schedule.push({
            accountNumber,
            installmentNumber: i,
            dueDate: dueDate.toISOString().split('T')[0],
            emiAmount: (principalComponent + interestComponent).toFixed(2),
            remainingBalanceAfter: currentBalance.toFixed(2), // Aligned to LoanEmiSchedule model
            status: 'pending',
        });
    }

    return schedule;
};