import { Sequelize } from 'sequelize';
import { sequelizeOptions, dbCredentials } from '../db.config.js';

import { initCustomerIdSequence } from './customer_id_sequence.model.js';
import { initCustomer } from './customer.model.js';
import { initAccount } from './account.model.js';
import { initSavingsAccount } from './savingsAccount.model.js';
import { initSavingsTransaction } from './savingsTransaction.model.js';
import { initLoanType } from './loanType.model.js';
import { initLoanRequest } from './loanRequest.model.js';
import { initLoanAccount } from './loanAccount.model.js';
import { initLoanEmiSchedule } from './loanEmiSchedule.model.js';

const sequelize = new Sequelize(
  dbCredentials.database,
  dbCredentials.username,
  dbCredentials.password,
  sequelizeOptions
);

const models = {
  CustomerIdSequence: initCustomerIdSequence(sequelize),
  Customer: initCustomer(sequelize),
  Account: initAccount(sequelize),
  SavingsAccount: initSavingsAccount(sequelize),
  SavingsTransaction: initSavingsTransaction(sequelize),
  LoanType: initLoanType(sequelize),
  LoanRequest: initLoanRequest(sequelize),
  LoanAccount: initLoanAccount(sequelize),
  LoanEmiSchedule: initLoanEmiSchedule(sequelize),
};

// connecting the tables based on their relation-mapping
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

export default {
  sequelize,
  Sequelize,
  ...models,
};
