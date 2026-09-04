import { Op } from 'sequelize'
import db from './shared/db/models/index.js';
import AppError from './shared/utils/appError.util.js';
import { comparePassword } from './shared/utils/password.util.js';
import { signAccessToken } from './shared/utils/jwt.util.js';
import { sendRegistrationReceivedEmail } from './shared/mail/mail.service.js'
import { generateCustomerCode } from './shared/utils/customerCode.util.js';

export const registerCustomer = async (registrationData, kycFilePath = null) => {
  // check existing customer with same mail or phone
  const existingCustomer = await db.Customer.findOne({
    where: {
      [Op.or]: [
        { email: registrationData.email },
        { phoneNumber: registrationData.phoneNumber },
        { aadhaarId: registrationData.aadhaarId },
      ]
    }
  });

  if (existingCustomer) {
    throw new AppError('Email, phone number, or Aadhaar ID already registered', 409);

  }

  const transaction = await db.sequelize.transaction();

  try {

    const customerCode = await generateCustomerCode(transaction);
    console.log("customer code",customerCode);

    const customer = await db.Customer.create({
      firstName: registrationData.firstName,
      lastName: registrationData.lastName,
      email: registrationData.email,
      phoneNumber: registrationData.phoneNumber,
      dateOfBirth: registrationData.dateOfBirth,
      aadhaarId: registrationData.aadhaarId,
      address: registrationData.address,
      city: registrationData.city,
      state: registrationData.state,
      country: registrationData.country,
      postalCode: registrationData.postalCode,
      intendedAccountType: registrationData.intendedAccountType,
      kycFilePath: kycFilePath,// kycFilePath.replace(/\\/g, '/') || null,
      customerCode: customerCode,
      password: null,
      status: 'pending',
      mustResetPassword: false,
    },
      { transaction }
    );

    await transaction.commit();

    // 3. Notify the customer their request was received.
    await sendRegistrationReceivedEmail(customer.email, customer.firstName);

    return {
      customerId: customer.customerId,
      customerCode: customer.customerCode,
      status: customer.status,
      message: 'Registration submitted. Awaiting manager approval.'
    }
  }
  catch (err) {
    console.error(err);
    await transaction.rollback();
    throw new AppError("Registration is not successful", 400);
  }
};

export const loginCustomer = async (loginData) => {
  const { customerCode, password } = loginData;

  const customer = await db.Customer.findOne({
    where: { customer_code: customerCode },
  });

  if (!customer || !customer.password || customer.status !== 'active') {
    throw new AppError('Invalid Credentials', 401);
  }

  const isMatch = await comparePassword(password, customer.password);

  if (!isMatch) {
    throw new AppError('Invalid Credentials', 401)
  }

  await customer.update({
    lastLoginAt: new Date()
  });

  const token = signAccessToken({
    sub: customer.customerId,
    role: 'customer'
  });

  return {
    token,
    user: {
      customerId: customer.customerId,
      customerCode:customer.customerCode,
      customerName: `${customer.firstName} ${customer.lastName}` ,
      role: 'customer',
      mustResetPassword: customer.mustResetPassword,
    }
  }
};


export const loginManager = async (managerData) => {
  const { username, password } = managerData;
  const adminUserName = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (username !== adminUserName || password !== adminPassword) {
    throw new AppError('Invalid Credentials', 401)
  }

  const token = signAccessToken({
    sub: username,
    role: 'manager',
  });

  return {
    token,
    user: {
      username,
      role: 'manager'
    }
  }

}

