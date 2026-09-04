import { Model, DataTypes } from 'sequelize';

export default class LoanType extends Model {
  static associate(models) {
    LoanType.hasMany(models.LoanRequest, { foreignKey: 'loanTypeId' });
  }
}



export const initLoanType = (sequelize) => {
  LoanType.init(
    {
      loanTypeId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      typeName: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      fixedInterestRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'LoanType',
      tableName: 'Loan_Types',
      freezeTableName: true,
      underscored: true,
      timestamps: false,
    }
  );

  return LoanType;
};
