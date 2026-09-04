import { Model, DataTypes } from 'sequelize';

export default class SavingsTransaction extends Model {
  static associate(models) {
    SavingsTransaction.belongsTo(models.SavingsAccount, { foreignKey: 'accountNumber' });
  }
}
export const initSavingsTransaction = (sequelize) => {
  SavingsTransaction.init(
    {
      transactionId: {
        type: DataTypes.STRING(20),
        primaryKey: true,
        allowNull: false,
      },
      accountNumber: {
        type: DataTypes.STRING(16),
        allowNull: false,
      },
      transactionType: {
        type: DataTypes.ENUM('deposit', 'withdrawal', 'debit', 'credit'),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      balanceAfter: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      referenceNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      channel: {
        type: DataTypes.ENUM('UPI', 'IMPS', 'NEFT', 'RTGS', 'ATM', 'BRANCH'),
        allowNull: false,
        defaultValue: 'UPI',
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('completed', 'failed'),
        defaultValue: 'completed',
      },
    },
    {
      sequelize,
      modelName: 'SavingsTransaction',
      tableName: 'Savings_Transactions',
      freezeTableName: true,
      underscored: true,
      timestamps: true,   // Automatically creates and handles created_at
      updatedAt: false,    // Disables updated_at for immutable audit trail
    }
  );

  return SavingsTransaction;
};