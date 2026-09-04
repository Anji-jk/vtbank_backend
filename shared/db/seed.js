import { faker } from '@faker-js/faker/locale/en_IN';
import db from './models/index.js';
import { generateCustomerCode } from '../utils/customerCode.util.js';
import { generateAccountNumber } from '../utils/accountNumber.util.js';
import { generateReferenceNumber } from '../utils/transaction.util.js';
import { calculateEmiDetails } from '../utils/loanCalculation.util.js';
import { hashPassword } from '../utils/password.util.js';

const NUM_CUSTOMERS = 100;
const SEED_PASSWORD = 'Seed@VTBank1!';

const INDIAN_STATES = [
  { state: 'Maharashtra', city: 'Mumbai' },
  { state: 'Karnataka', city: 'Bengaluru' },
  { state: 'Tamil Nadu', city: 'Chennai' },
  { state: 'Delhi', city: 'New Delhi' },
  { state: 'West Bengal', city: 'Kolkata' },
  { state: 'Telangana', city: 'Hyderabad' },
  { state: 'Gujarat', city: 'Ahmedabad' },
  { state: 'Rajasthan', city: 'Jaipur' },
  { state: 'Uttar Pradesh', city: 'Lucknow' },
  { state: 'Kerala', city: 'Kochi' },
  { state: 'Punjab', city: 'Chandigarh' },
  { state: 'Madhya Pradesh', city: 'Bhopal' },
];

const LOAN_TYPE_DEFS = [
  { typeName: 'Personal Loan', fixedInterestRate: 12.5, isActive: true },
  { typeName: 'Home Loan', fixedInterestRate: 8.5, isActive: true },
  { typeName: 'Car Loan', fixedInterestRate: 9.75, isActive: true },
  { typeName: 'Education Loan', fixedInterestRate: 10.25, isActive: true },
  { typeName: 'Gold Loan', fixedInterestRate: 11.0, isActive: true },
];

const usedEmails = new Set();
const usedPhones = new Set();
const usedAadhaar = new Set();
const usedAccountNumbers = new Set();

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function uniqueEmail(first, last) {
  let email;
  do {
    email = faker.internet
      .email({ firstName: first, lastName: last, provider: 'vtbank.test' })
      .toLowerCase();
  } while (usedEmails.has(email));
  usedEmails.add(email);
  return email;
}

function uniquePhone() {
  let phone;
  do {
    phone = faker.helpers.arrayElement(['6', '7', '8', '9']) + faker.string.numeric(9);
  } while (usedPhones.has(phone));
  usedPhones.add(phone);
  return phone;
}

function uniqueAadhaar() {
  let aadhaar;
  do {
    aadhaar = faker.string.numeric(12);
  } while (usedAadhaar.has(aadhaar));
  usedAadhaar.add(aadhaar);
  return aadhaar;
}

function uniqueAccountNumber(customerCode) {
  let accountNumber;
  do {
    accountNumber = generateAccountNumber(customerCode);
  } while (usedAccountNumbers.has(accountNumber));
  usedAccountNumbers.add(accountNumber);
  return accountNumber;
}

function randomIndianAddress() {
  const place = faker.helpers.arrayElement(INDIAN_STATES);
  return {
    address: faker.location.streetAddress(),
    city: place.city,
    state: place.state,
    country: 'India',
    postalCode: faker.string.numeric(6),
  };
}

async function seedLoanTypes() {
  for (const type of LOAN_TYPE_DEFS) {
    await db.LoanType.findOrCreate({
      where: { typeName: type.typeName },
      defaults: type,
    });
  }

  const types = await db.LoanType.findAll({ where: { isActive: true } });
  if (!types.length) {
    throw new Error('No active loan types available after seeding Loan_Types.');
  }
  return types;
}

async function createLedgerEntry({
  accountNumber,
  transactionType,
  amount,
  balanceAfter,
  channel,
  description,
  createdAt,
  status = 'completed',
}) {
  return db.SavingsTransaction.create({
    transactionId: generateReferenceNumber('TXN'),
    accountNumber,
    transactionType,
    amount: round2(amount),
    balanceAfter: round2(balanceAfter),
    referenceNumber: generateReferenceNumber('REF'),
    channel,
    description,
    status,
    createdAt,
  });
}

async function applySavingsMovement(savingsAccount, { type, amount, channel, description, createdAt }) {
  const current = round2(savingsAccount.currentBalance);
  const delta = type === 'deposit' || type === 'credit' ? amount : -amount;
  const next = round2(current + delta);

  if (next < 0) {
    return savingsAccount;
  }

  await savingsAccount.update({ currentBalance: next });
  await createLedgerEntry({
    accountNumber: savingsAccount.accountNumber,
    transactionType: type,
    amount,
    balanceAfter: next,
    channel,
    description,
    createdAt,
  });

  return savingsAccount.reload();
}

function buildAmortizationSchedule(accountNumber, principal, annualRate, tenureMonths, startDate) {
  const monthlyRate = Number(annualRate) / 12 / 100;
  const emi = calculateEmiDetails(principal, annualRate, tenureMonths);
  let currentBalance = round2(principal);
  const schedule = [];

  for (let i = 1; i <= tenureMonths; i++) {
    const interestAmount = round2(currentBalance * monthlyRate);
    let principalAmount = round2(emi - interestAmount);

    if (i === tenureMonths) {
      principalAmount = currentBalance;
    }

    currentBalance = round2(Math.max(0, currentBalance - principalAmount));
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      accountNumber,
      installmentNumber: i,
      dueDate: dueDate.toISOString().split('T')[0],
      principalAmount,
      interestAmount,
      emiAmount: round2(principalAmount + interestAmount),
      status: 'pending',
      amountPaid: null,
      paidAt: null,
      transactionReference: null,
      remainingBalanceAfter: currentBalance,
    });
  }

  return schedule;
}

async function createSavingsBundle(customer, createdAt, { closed = false } = {}) {
  const accountNumber = uniqueAccountNumber(customer.customerCode);
  const minimumBalance = faker.helpers.arrayElement([0, 1000, 2500, 5000]);
  const withdrawalLimit = faker.helpers.arrayElement([50000, 100000, 200000, 500000]);

  await db.Account.create({
    accountNumber,
    customerId: customer.customerId,
    accountType: 'savings',
    currency: 'INR',
    status: closed ? 'closed' : 'active',
    createdAt,
  });

  const savingsAccount = await db.SavingsAccount.create({
    accountNumber,
    currentBalance: 0,
    minimumBalance,
    withdrawalLimit,
  });

  const depositCount = faker.number.int({ min: 3, max: 8 });
  for (let i = 0; i < depositCount; i++) {
    await applySavingsMovement(savingsAccount, {
      type: 'deposit',
      amount: faker.number.int({ min: 2000, max: 80000 }),
      channel: faker.helpers.arrayElement(['UPI', 'IMPS', 'NEFT', 'RTGS', 'ATM', 'BRANCH']),
      description: 'Seed deposit',
      createdAt: faker.date.between({ from: createdAt, to: new Date() }),
    });
  }

  const withdrawalCount = faker.number.int({ min: 0, max: 3 });
  for (let i = 0; i < withdrawalCount; i++) {
    const available = round2(savingsAccount.currentBalance) - round2(savingsAccount.minimumBalance);
    if (available < 500) break;
    await applySavingsMovement(savingsAccount, {
      type: 'withdrawal',
      amount: faker.number.int({ min: 500, max: Math.min(15000, Math.floor(available)) }),
      channel: faker.helpers.arrayElement(['UPI', 'ATM', 'BRANCH']),
      description: 'Seed withdrawal',
      createdAt: faker.date.between({ from: createdAt, to: new Date() }),
    });
  }

  return savingsAccount;
}

async function createLoanContainer(customer, createdAt) {
  const accountNumber = uniqueAccountNumber(customer.customerCode);

  await db.Account.create({
    accountNumber,
    customerId: customer.customerId,
    accountType: 'loan',
    currency: 'INR',
    status: 'active',
    createdAt,
  });

  const loanAccount = await db.LoanAccount.create({
    accountNumber,
    status: 'active',
  });

  return loanAccount;
}

async function seedLoanLifecycle(customer, savingsAccount, loanAccount, loanTypes, createdAt) {
  const loanType = faker.helpers.arrayElement(loanTypes);
  const requestedAmount = faker.number.int({ min: 50000, max: 1500000 });
  const tenureMonths = faker.helpers.arrayElement([12, 24, 36, 48, 60]);
  const calculatedEmi = calculateEmiDetails(
    requestedAmount,
    loanType.fixedInterestRate,
    tenureMonths
  );

  // EMI payments debit the linked savings account — keep a workable balance.
  await applySavingsMovement(savingsAccount, {
    type: 'deposit',
    amount: faker.number.int({ min: 40000, max: 150000 }),
    channel: 'BRANCH',
    description: 'Seed top-up before loan request',
    createdAt: faker.date.between({ from: createdAt, to: new Date() }),
  });

  const requestCreatedAt = faker.date.between({ from: createdAt, to: new Date() });
  const loanRequest = await db.LoanRequest.create({
    customerId: customer.customerId,
    loanTypeId: loanType.loanTypeId,
    requestedAmount,
    linkedSavingsAccountNumber: savingsAccount.accountNumber,
    tenureMonths,
    calculatedEmi,
    status: 'pending',
    createdAt: requestCreatedAt,
  });

  const outcome = faker.helpers.weightedArrayElement([
    { value: 'approve', weight: 7 },
    { value: 'reject', weight: 2 },
    { value: 'pending', weight: 1 },
  ]);

  if (outcome === 'pending') {
    return;
  }

  if (outcome === 'reject') {
    await loanRequest.update({
      status: 'rejected',
      rejectionReason: faker.helpers.arrayElement([
        'Insufficient repayment capacity based on current savings history.',
        'KYC documents could not be verified for the requested tenure.',
        'Requested amount exceeds eligibility for the selected loan type.',
      ]),
      reviewedAt: faker.date.soon({ days: 10, refDate: requestCreatedAt }),
    });
    return;
  }

  const disbursedAt = faker.date.soon({ days: 7, refDate: requestCreatedAt });
  await loanRequest.update({
    status: 'approved',
    reviewedAt: disbursedAt,
  });

  await loanAccount.update({
    requestId: loanRequest.requestId,
    totalLoanAmount: requestedAmount,
    interestRate: loanType.fixedInterestRate,
    tenureMonths,
    emiAmount: calculatedEmi,
    remainingBalance: requestedAmount,
    status: 'active',
    disbursedAt,
  });

  const scheduleRows = buildAmortizationSchedule(
    loanAccount.accountNumber,
    requestedAmount,
    loanType.fixedInterestRate,
    tenureMonths,
    disbursedAt
  );
  await db.LoanEmiSchedule.bulkCreate(scheduleRows);

  await applySavingsMovement(savingsAccount, {
    type: 'credit',
    amount: requestedAmount,
    channel: 'BRANCH',
    description: `Loan disbursement for ${loanAccount.accountNumber}`,
    createdAt: disbursedAt,
  });

  const schedule = await db.LoanEmiSchedule.findAll({
    where: { accountNumber: loanAccount.accountNumber },
    order: [['installmentNumber', 'ASC']],
  });

  const paidCount = faker.number.int({ min: 0, max: Math.min(8, schedule.length) });
  for (let i = 0; i < paidCount; i++) {
    const emi = schedule[i];
    const emiAmount = round2(emi.emiAmount);
    const available = round2(savingsAccount.currentBalance);

    if (available < emiAmount) {
      await applySavingsMovement(savingsAccount, {
        type: 'deposit',
        amount: emiAmount + faker.number.int({ min: 2000, max: 20000 }),
        channel: 'UPI',
        description: 'Seed top-up before EMI debit',
        createdAt: new Date(emi.dueDate),
      });
    }

    const paidAt = new Date(emi.dueDate);
    await applySavingsMovement(savingsAccount, {
      type: 'debit',
      amount: emiAmount,
      channel: 'BRANCH',
      description: `EMI payment for loan account ${loanAccount.accountNumber}, installment ${emi.installmentNumber}`,
      createdAt: paidAt,
    });

    const principalPaid = round2(emi.principalAmount);
    const remainingBalance = round2(Math.max(0, Number(loanAccount.remainingBalance) - principalPaid));
    await loanAccount.update({ remainingBalance });

    await emi.update({
      status: 'paid',
      amountPaid: emiAmount,
      paidAt,
      transactionReference: generateReferenceNumber('EMI'),
      remainingBalanceAfter: remainingBalance,
    });
  }

  const today = new Date().toISOString().split('T')[0];
  const unpaid = await db.LoanEmiSchedule.findAll({
    where: { accountNumber: loanAccount.accountNumber, status: 'pending' },
  });
  for (const emi of unpaid) {
    if (emi.dueDate < today) {
      await emi.update({ status: 'overdue' });
    }
  }

  if (round2(loanAccount.remainingBalance) === 0) {
    await loanAccount.update({ status: 'active' });
    await db.Account.update(
      { status: 'closed' },
      { where: { accountNumber: loanAccount.accountNumber } }
    );
  } else if (paidCount > 0) {
    await loanAccount.update({ status: 'ongoing' });
  }
}

async function seedCustomer(loanTypes, passwordHash) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  const customerStatus = faker.helpers.weightedArrayElement([
    { value: 'active', weight: 7 },
    { value: 'pending', weight: 2 },
    { value: 'suspended', weight: 1 },
  ]);

  // Pending = registration only. Active/suspended randomly get savings, loan, or both.
  const accountMix = faker.helpers.weightedArrayElement([
    { value: 'savings', weight: 4 },
    { value: 'loan', weight: 2 },
    { value: 'both', weight: 4 },
  ]);

  const intendedAccountType =
    accountMix === 'both'
      ? faker.helpers.arrayElement(['savings', 'loan'])
      : accountMix;

  const createdAt = faker.date.past({ years: 2 });
  const place = randomIndianAddress();
  const hasLoggedIn = customerStatus !== 'pending' && faker.datatype.boolean(0.7);

  const customer = await db.sequelize.transaction(async (t) => {
    const customerCode = await generateCustomerCode(t);
    return db.Customer.create(
      {
        customerCode,
        firstName,
        lastName,
        email: uniqueEmail(firstName, lastName),
        phoneNumber: uniquePhone(),
        password: customerStatus === 'pending' ? null : passwordHash,
        lastLoginAt: hasLoggedIn ? faker.date.recent({ days: 40 }) : null,
        dateOfBirth: faker.date.birthdate({ min: 21, max: 65, mode: 'age' }),
        aadhaarId: uniqueAadhaar(),
        ...place,
        kycFilePath: `uploads/kyc/seed-${customerCode}.pdf`,
        intendedAccountType,
        status: customerStatus,
        mustResetPassword: customerStatus !== 'pending' && !hasLoggedIn,
        createdAt,
      },
      { transaction: t }
    );
  });

  if (customerStatus === 'pending') {
    return customer;
  }

  let savingsAccount = null;
  if (accountMix === 'savings' || accountMix === 'both') {
    savingsAccount = await createSavingsBundle(customer, createdAt, {
      closed: faker.datatype.boolean(0.08),
    });
  }

  if (accountMix === 'loan' || accountMix === 'both') {
    const loanAccount = await createLoanContainer(customer, createdAt);
    if (savingsAccount) {
      await seedLoanLifecycle(customer, savingsAccount, loanAccount, loanTypes, createdAt);
    }
  }

  return customer;
}

async function seed() {
  await db.sequelize.authenticate();
  console.log('DB connected. Seeding VTBank tables...');

  const loanTypes = await seedLoanTypes();
  console.log(`Loan types ready (${loanTypes.length}).`);

  const passwordHash = await hashPassword(SEED_PASSWORD);
  console.log(`Active/suspended customers can log in with: ${SEED_PASSWORD}`);

  for (let i = 0; i < NUM_CUSTOMERS; i++) {
    await seedCustomer(loanTypes, passwordHash);

    if ((i + 1) % 10 === 0 || i === NUM_CUSTOMERS - 1) {
      console.log(`  Seeded ${i + 1}/${NUM_CUSTOMERS} customers...`);
    }
  }

  console.log('Seeding finished successfully.');
  await db.sequelize.close();
}

seed().catch(async (err) => {
  console.error('Seeding failed:', err);
  await db.sequelize.close();
  process.exit(1);
});
