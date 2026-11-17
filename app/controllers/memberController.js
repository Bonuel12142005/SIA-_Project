import { Member, Livestock } from '../models/index.js';

export const index = async (req, res) => {
  try {
    const members = await Member.findAll({
      include: [{ model: Livestock, as: 'livestock' }],
      order: [['created_at', 'DESC']]
    });

    res.render('members/index', {
      title: 'Member Management - KAMBAC',
      members: members.map(m => m.toJSON()),
      activeNav: 'members'
    });
  } catch (error) {
    console.error('Member index error:', error);
    req.flash('error_msg', 'Failed to load members');
    res.redirect('/dashboard');
  }
};

export const create = async (req, res) => {
  try {
    const { first_name, last_name, contact_number, address } = req.body;

    if (!first_name || !last_name) {
      req.flash('error_msg', 'First name and last name are required');
      return res.redirect('/members');
    }

    // Auto-generate member code: MEM-YYYY-XXX
    const count = await Member.count();
    const member_code = `MEM-${String(count + 1).padStart(4, '0')}`;

    await Member.create({
      member_code,
      first_name,
      last_name,
      contact_number,
      address,
      membership_status: 'active'
    });

    req.flash('success_msg', `Member ${first_name} ${last_name} registered successfully!`);
    res.redirect('/members');
  } catch (error) {
    console.error('Member create error:', error);
    req.flash('error_msg', 'Failed to create member: ' + error.message);
    res.redirect('/members');
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, contact_number, address, membership_status } = req.body;

    const member = await Member.findByPk(id);
    if (!member) {
      req.flash('error_msg', 'Member not found');
      return res.redirect('/members');
    }

    await member.update({
      first_name,
      last_name,
      contact_number,
      address,
      membership_status: membership_status || member.membership_status
    });

    req.flash('success_msg', 'Member updated successfully');
    res.redirect('/members');
  } catch (error) {
    console.error('Member update error:', error);
    req.flash('error_msg', 'Failed to update member');
    res.redirect('/members');
  }
};

export const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.findByPk(id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const newStatus = member.membership_status === 'active' ? 'inactive' : 'active';
    await member.update({ membership_status: newStatus });

    req.flash('success_msg', `Member status updated to ${newStatus}`);
    res.redirect('/members');
  } catch (error) {
    console.error('Toggle member status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API endpoint for dynamic dropdowns
export const apiList = async (req, res) => {
  try {
    const members = await Member.findAll({
      where: { membership_status: 'active' },
      order: [['first_name', 'ASC']]
    });
    res.json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
