import bcrypt from 'bcrypt';
import { User } from '../models/index.js';

export const showLogin = (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', {
    title: 'Login - KAMBAC Livestock Management System',
    layout: false
  });
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      req.flash('error_msg', 'Email and password are required');
      return res.redirect('/login');
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      req.flash('error_msg', 'Invalid credentials');
      return res.redirect('/login');
    }

    if (user.status !== 'active') {
      req.flash('error_msg', 'Your account has been deactivated or suspended');
      return res.redirect('/login');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      req.flash('error_msg', 'Invalid credentials');
      return res.redirect('/login');
    }

    // Set user session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    req.flash('success_msg', `Welcome back, ${user.name}!`);
    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error_msg', 'An error occurred during login. Please try again.');
    return res.redirect('/login');
  }
};

export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/login');
  });
};
