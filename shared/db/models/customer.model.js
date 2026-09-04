import { Model, DataTypes } from 'sequelize';

export default class Customer extends Model {
    //defining relations with other tables
  static associate(models) {
    Customer.hasMany(models.Account, { foreignKey: 'customerId' });
    Customer.hasMany(models.LoanRequest, { foreignKey: 'customerId' });
  }
}

export const initCustomer = (sequelize) => {
  Customer.init(
    // table columns
    {
      customerId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      customerCode:{
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
      },
      firstName: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      phoneNumber: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      aadhaarId: {
        type: DataTypes.STRING(12),
        allowNull: false,
        unique: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      state: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      postalCode: {
        type: DataTypes.STRING(6),
        allowNull: false,
      },
      kycFilePath: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      intendedAccountType: {
        type: DataTypes.ENUM('savings', 'loan'),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('active', 'suspended', 'pending'),
        defaultValue: 'pending',
      },
      mustResetPassword: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,  // true after manager sets system password
      },
    },
    //manage model
    {
      sequelize,
      modelName: 'Customer',
      tableName: 'Customers',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      updatedAt: false,
    }
  );

  return Customer;
};
