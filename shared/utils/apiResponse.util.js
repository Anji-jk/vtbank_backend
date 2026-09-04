export const success = (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  };
  
  export const fail = (res, message = 'Something went wrong', statusCode = 400, errors = null) => {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  };