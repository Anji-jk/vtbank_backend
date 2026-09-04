import { Model, DataTypes } from 'sequelize';

export default class LoanEmiSchedule extends Model {
  static associate(models) {
    LoanEmiSchedule.belongsTo(models.LoanAccount, { foreignKey: 'accountNumber' });
  }
}

export const initLoanEmiSchedule = (sequelize) => {
  LoanEmiSchedule.init(
    {
      scheduleId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      accountNumber: {
        type: DataTypes.STRING(16),
        allowNull: false,
      },
      installmentNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      principalAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      interestAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      emiAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'paid', 'overdue'),
        defaultValue: 'pending',
      },
      amountPaid: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      transactionReference: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
      },
      remainingBalanceAfter: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'LoanEmiSchedule',
      tableName: 'Loan_EMI_Schedule',
      freezeTableName: true,
      underscored: true,
      timestamps: false,
    }
  );
  return LoanEmiSchedule;
};