export const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Please log in to access this page');
  return res.redirect('/login');
};

export const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error_msg', 'Access denied. Administrator privileges required.');
  return res.redirect('/dashboard');
};

export const attachUserToLocals = (req, res, next) => {
  res.locals.currentUser = req.session ? req.session.user : null;
  res.locals.success_msg = req.flash ? req.flash('success_msg') : null;
  res.locals.error_msg = req.flash ? req.flash('error_msg') : null;
  next();
};
