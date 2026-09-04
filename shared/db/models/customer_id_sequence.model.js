import { Model, DataTypes } from 'sequelize';

export default class CustomerIdSequence extends Model {}

export const initCustomerIdSequence = (sequelize) => {
  CustomerIdSequence.init(
    {
      year: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      lastNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'last_number', // Maps JS property to DB column
      },
    },
    {
      sequelize,
      modelName: 'CustomerIdSequence',
      tableName: 'Customer_id_sequences',
      freezeTableName: true,
      underscored: true,
      timestamps: false,
      updatedAt: false,
    }
  );

  return CustomerIdSequence;
};