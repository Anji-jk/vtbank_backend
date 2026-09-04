import { Model, DataTypes } from 'sequelize';

export default class Account extends Model {
  static associate(models) {
    Account.belongsTo(models.Customer, { foreignKey: 'customerId' });
    Account.hasOne(models.SavingsAccount, { foreignKey: 'accountNumber' });
    Account.hasOne(models.LoanAccount, { foreignKey: 'accountNumber' });
  }
}

export const initAccount = (sequelize) => {
  Account.init(
    {
      accountNumber: {
        type: DataTypes.STRING(16),
        primaryKey: true,
      },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      accountType: {
        type: DataTypes.ENUM('savings', 'loan'),
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'INR',
      },
      status: {
        type: DataTypes.ENUM('active', 'pending', 'closed'),
        defaultValue: 'pending',
      },
    },
    {
      sequelize,
      modelName: 'Account',
      tableName: 'Accounts',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      updatedAt: false,
    }
  );

  return Account;
};
