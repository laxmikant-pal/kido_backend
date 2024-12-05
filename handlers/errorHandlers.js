const logger = require('./logger');
const helper = require('./helper');
const config = require('../config/');

/*
  Catch Errors Handler

  With async/await, you need some way to catch errors
  Instead of using try{} catch(e) {} in each controller, we wrap the function in
  catchErrors(), catch any errors they throw, and pass it along to our express middleware with next()
*/

// exports.catchErrors = (fn) => {
//   return function (req, res, next) {
//     return fn(req, res, next).catch(next);
//   };
// };

/*
  Not Found Error Handler

  If we hit a route that is not found, we mark it as 404 and pass it along to the next error handler to display
*/
// exports.notFound = (req, res, next) => {
//   const err = new Error('Not Found');
//   err.status = 404;
//   next(err);
// };

/*
  MongoDB Validation Error Handler

  Detect if there are mongodb validation errors that we can nicely show via flash messages
*/

exports.flashValidationErrors = (err, req, res, next) => {
  if (!err.errors) return next(err);
  // validation errors look like
  const errorKeys = Object.keys(err.errors);
  errorKeys.forEach(key => req.flash('error', err.errors[key].message));
  res.redirect('back');
  return;
};


/*
  Development Error Handler

  In development we show good error messages so if we hit a syntax error or any other previously un-handled error, we can show good info on what happened
*/
// exports.developmentErrors = (err, req, res, next) => {
//   err.stack = err.stack || '';
//   const errorDetails = {
//     message: err.message,
//     status: err.status,
//     stackHighlighted: err.stack
//   };
//   res.status(err.status || 500);
//   res.format({
//     // Form Submit, Reload the page
//     'application/json': () => res.json(errorDetails) // Ajax call, send JSON back
//   });
// };


/*
  Production Error Handler

  No stacktraces are leaked to user
*/
// exports.productionErrors = (err, req, res, next) => {
//   res.status(err.status || 500);
//   res.json('error', {
//     message: err.message,
//     error: {}
//   });
// };



/*
    Not Found Dev
*/
exports.notFoundDev = (req, res, next) => {
  const err = new Error('This link cannot be Found');
  err.status = 404;
  next(err);
};

/*
    Not Found Prod
*/
exports.notFoundProd = (req, res, next) => {
  const err = new Error('This link cannot be Found');
  if (req.originalUrl.includes('/admin/')) {
    return res.redirect('/admin/404');
  }
  err.status = 404;
  next(err);
};

/*
    Error responder Dev

    Development Error Handler
*/
exports.errorResponderDev = async (err, req, res, next) => {
  if (err.type == 'redirect') {
    next(err);
  } else if (err.type == 'time-out') {
    err.code = 408
    next(err);
  } else {
    next(err) // forwarding exceptional case to fail-safe middleware
  }
};

/*
Development Error Handler

In development we show good error messages so if we hit a syntax error or any other previously un-handled error, we can show good info on what happened
*/
exports.errorHandlingMiddlewareDev = (err, req, res, next) => {
  err.stack = err.stack || '';
  err.code = err.code ? err.code : err.status || 500;
  err.errPath = req.originalUrl || "";

  let errorDetails;

  if (config.server.devenv == "dev") {
    errorDetails = helper.errorDetails(err.message || 'Development error', err.code, err.status, err.type || "", err.stack, err.errMsg || null, err.errPath || "", err.payload || null, err.currentUser || null, err.projectPath);
  } else {
    errorDetails = helper.toBeDeletedErrorDetails(err.message || 'Development error', err.code, err.status, err.type || "", err.payload || null);
  }

  logger.log('error', errorDetails);

  err.type = null;
  err.errMsg = null;
  err.path = null;
  err.payload = null;
  err.currentUser = null;

  return res.status(err.status || 500).format({
    // Form Submit, Reload the page
    'application/json': () => res.json(errorDetails) // Ajax call, send JSON back
  });
};

/*
    Error responder Prod

    Production Error Handling middleware case
*/
exports.errorResponderProd = (err, req, res, next) => {
  if (err.type == 'redirect') {
    err.stack = err.stack || '';
    err.code = err.code ? err.code : err.status || 500;

    const errorDetails = helper.errorDetails(err.message || 'admin Development error', err.code, err.status, err.type || "", err.stack, err.errMsg || null, err.errPath || "", err.payload || null, err.currentUser || null);

    logger.log('error', errorDetails);

    err.type = null;
    err.errMsg = null;
    err.path = null;
    err.payload = null;
    err.currentUser = null;

    return res.redirect('/admin/error');
  } else if (err.type == 'time-out') {
    err.code = 408
    next(err);
  } else {
    next(err) // forwarding exceptional case to fail-safe middleware
  }
};

/*
Production Error Handling middleware case

No stacktraces are leaked to user
*/
exports.errorHandlingMiddlewareProd = (err, req, res, next) => {
  err.stack = err.stack || '';
  err.code = err.code ? err.code : err.status || 500;

  const errorDetails = helper.errorDetails(err.message || 'Production error', err.code, err.status, err.type || "", err.stack, err.errMsg || null, err.errPath || "", err.payload || null, err.currentUser || null);

  logger.log('error', errorDetails);

  err.type = null;
  err.errMsg = null;
  err.path = null;
  err.payload = null;
  err.currentUser = null;

  return res.status(err.status || 500).json({
    message: err.message || 'Unauthorized',
    data: [],
    type: err.type || "",
    code: err.code ? err.code : err.status || 500
  })
};