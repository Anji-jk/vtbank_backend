import { Model, DataTypes } from 'sequelize';

export default class LoanAccount extends Model {
  static associate(models) {
    LoanAccount.belongsTo(models.Account, { foreignKey: 'accountNumber' });
    LoanAccount.belongsTo(models.LoanRequest, { foreignKey: 'requestId' });
    LoanAccount.hasMany(models.LoanEmiSchedule, { foreignKey: 'accountNumber' });
  }
}

export const initLoanAccount = (sequelize) => {
  LoanAccount.init(
    {
      accountNumber: {
        type: DataTypes.STRING(16),
        primaryKey: true,
      },
      requestId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        unique: true,
      },
      totalLoanAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      interestRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      tenureMonths: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      emiAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      remainingBalance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('active', 'ongoing', 'suspended'),
        defaultValue: 'active',
      },
      disbursedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'LoanAccount',
      tableName: 'Loan_Accounts',
      freezeTableName: true,
      underscored: true,
      timestamps: false,
    }
  );
  return LoanAccount;
};