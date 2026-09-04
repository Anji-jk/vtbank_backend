import { Model, DataTypes } from 'sequelize';

export default class SavingsAccount extends Model {
  static associate(models) {
    SavingsAccount.belongsTo(models.Account, { foreignKey: 'accountNumber' });
    SavingsAccount.hasMany(models.SavingsTransaction, { foreignKey: 'accountNumber' });
  }
}

export const initSavingsAccount = (sequelize) => {
  SavingsAccount.init(
    {
      accountNumber: {
        type: DataTypes.STRING(16),
        primaryKey: true,
      },
      currentBalance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      minimumBalance: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0.0,
      },
      withdrawalLimit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 500000,
      },
    },
    {
      sequelize,
      modelName: 'SavingsAccount',
      tableName: 'Savings_Accounts',
      freezeTableName: true,
      underscored: true,
      timestamps: false,
    }
  );

  return SavingsAccount;
};
