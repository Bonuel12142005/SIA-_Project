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
  const user = req.session ? req.session.user : null;
  if (user && user.name) {
    const parts = user.name.trim().split(/\s+/);
    user.initials = parts.length > 1 
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (parts[0][0] || 'U').toUpperCase();
  }
  res.locals.currentUser = user;
  res.locals.success_msg = req.flash ? req.flash('success_msg') : null;
  res.locals.error_msg = req.flash ? req.flash('error_msg') : null;
  next();
};
