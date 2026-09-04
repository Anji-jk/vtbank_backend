import { Model, DataTypes } from 'sequelize';

export default class LoanRequest extends Model {
  static associate(models) {
    LoanRequest.belongsTo(models.Customer, { foreignKey: 'customerId' });
    LoanRequest.belongsTo(models.LoanType, { foreignKey: 'loanTypeId' });
    LoanRequest.belongsTo(models.SavingsAccount, { 
      foreignKey: 'linkedSavingsAccountNumber',
      as: 'linkedSavingsAccount' 
    });
    LoanRequest.hasOne(models.LoanAccount, { foreignKey: 'requestId' });
  }
}

export const initLoanRequest = (sequelize) => {
  LoanRequest.init(
    {
      requestId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      loanTypeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      requestedAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      linkedSavingsAccountNumber: {
        type: DataTypes.STRING(16),
        allowNull: true,
      },
      tenureMonths: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      calculatedEmi: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
      },
      rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'LoanRequest',
      tableName: 'Loan_Requests',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      updatedAt: false,
    }
  );

  return LoanRequest;
};
