import { Op } from 'sequelize';
import { sequelize, Member, Livestock, LivestockHealthRecord, LivestockWeightHistory, LivestockArchiveHistory } from '../models/index.js';

// Calculate animal age from birth date or acquisition date
function formatAge(birthDate, dateAcquired) {
  const refDate = birthDate ? new Date(birthDate) : (dateAcquired ? new Date(dateAcquired) : null);
  if (!refDate || isNaN(refDate.getTime())) return 'N/A';
  
  const now = new Date();
  let months = (now.getFullYear() - refDate.getFullYear()) * 12 + (now.getMonth() - refDate.getMonth());
  if (months < 0) months = 0;

  if (months < 1) {
    const days = Math.floor((now - refDate) / (1000 * 60 * 60 * 24));
    return `${days} days old`;
  }
  if (months < 12) {
    return `${months} mos old`;
  }
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths > 0 ? `${years}y ${remMonths}m old` : `${years} yrs old`;
}

/**
 * Dashboard & Active Livestock View
 */
export const dashboard = async (req, res) => {
  try {
    // 1. Fetch Dynamic Statistics from MySQL
    const totalLivestock = await Livestock.count({ where: { archive_status: 'active' } });
    const healthyCount = await Livestock.count({
      where: {
        archive_status: 'active',
        health_status: 'Healthy'
      }
    });
    const needsMonitoringCount = await Livestock.count({
      where: {
        archive_status: 'active',
        health_status: { [Op.in]: ['Needs Monitoring', 'Critical', 'Under Treatment'] }
      }
    });

    const totalEstimatedValueResult = await Livestock.sum('estimated_value', {
      where: { archive_status: 'active' }
    });
    const totalEstimatedValue = totalEstimatedValueResult || 0;

    // 2. Fetch Active Livestock Records with Member info
    const activeLivestock = await Livestock.findAll({
      where: { archive_status: 'active' },
      include: [{ model: Member, as: 'owner' }],
      order: [['created_at', 'DESC']]
    });

    // 3. Fetch Members for the Registration Modal Dropdown
    const members = await Member.findAll({
      where: { membership_status: 'active' },
      order: [['first_name', 'ASC']]
    });

    // Transform livestock records with formatted display properties
    const formattedLivestock = activeLivestock.map(item => {
      const plain = item.toJSON();
      plain.age = formatAge(plain.birth_date, plain.date_acquired);
      plain.formatted_value = Number(plain.estimated_value).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      plain.isHealthy = plain.health_status === 'Healthy';
      plain.isNeedsMonitoring = ['Needs Monitoring', 'Critical', 'Under Treatment'].includes(plain.health_status);
      return plain;
    });

    res.render('dashboard', {
      title: 'KAMBAC Livestock Management System - Dashboard',
      stats: {
        totalLivestock,
        healthyCount,
        needsMonitoringCount,
        formattedEstimatedValue: Number(totalEstimatedValue).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      },
      livestockList: formattedLivestock,
      members: members.map(m => m.toJSON()),
      activeNav: 'overview'
    });
  } catch (error) {
    console.error('Dashboard loading error:', error);
    req.flash('error_msg', 'Failed to load dashboard data: ' + error.message);
    res.render('dashboard', {
      title: 'KAMBAC Dashboard',
      stats: { totalLivestock: 0, healthyCount: 0, needsMonitoringCount: 0, formattedEstimatedValue: '0.00' },
      livestockList: [],
      members: [],
      activeNav: 'overview'
    });
  }
};

/**
 * Register New Livestock (Add Livestock Modal)
 * Handles both Standard Form POST and AJAX / JSON Submissions
 */
export const store = async (req, res) => {
  const isAjax = req.xhr || req.headers.accept?.includes('application/json') || req.is('application/json');

  try {
    const {
      member_id,
      animal_name,
      animal_type,
      breed,
      sex,
      date_acquired,
      birth_date,
      initial_weight,
      current_weight,
      health_status,
      estimated_value
    } = req.body;

    // 1. Validation: check required fields
    if (!member_id) {
      if (isAjax) return res.status(400).json({ success: false, message: 'Please select an owner/member.' });
      req.flash('error_msg', 'Please select an owner/member.');
      return res.redirect('/dashboard');
    }

    if (!animal_type || !date_acquired) {
      const msg = 'Animal type and acquisition date are required.';
      if (isAjax) return res.status(400).json({ success: false, message: msg });
      req.flash('error_msg', msg);
      return res.redirect('/dashboard');
    }

    // Verify member existence to prevent foreign key errors
    const member = await Member.findByPk(member_id);
    if (!member) {
      const msg = 'Selected member does not exist in the database.';
      if (isAjax) return res.status(400).json({ success: false, message: msg });
      req.flash('error_msg', msg);
      return res.redirect('/dashboard');
    }

    // 2. Format and sanitize values
    const numWeight = parseFloat(initial_weight !== undefined && initial_weight !== '' ? initial_weight : (current_weight || 0)) || 0;
    const numCurrentWeight = parseFloat(current_weight !== undefined && current_weight !== '' ? current_weight : numWeight) || numWeight;
    const numValue = parseFloat(estimated_value) || 0;

    // Validate enum values
    const validSexes = ['Male', 'Female', 'Unknown'];
    const sanitizedSex = validSexes.includes(sex) ? sex : 'Male';

    const validHealthStatuses = ['Healthy', 'Under Treatment', 'Critical', 'Needs Monitoring', 'Vaccinated'];
    const sanitizedHealthStatus = validHealthStatuses.includes(health_status) ? health_status : 'Healthy';

    // 3. Collision-safe Livestock Code Generation using MAX(id)
    const maxItem = await Livestock.findOne({
      order: [['id', 'DESC']],
      attributes: ['id']
    });
    const nextSeq = (maxItem ? Number(maxItem.id) : 0) + 1;
    const year = new Date().getFullYear();
    let livestock_code = `LS-${year}-${String(nextSeq).padStart(4, '0')}`;

    // Ensure uniqueness in case of race condition or custom codes
    let counter = nextSeq;
    while (await Livestock.findOne({ where: { livestock_code } })) {
      counter++;
      livestock_code = `LS-${year}-${String(counter).padStart(4, '0')}`;
    }

    const resolvedName = animal_name && animal_name.trim() !== '' 
      ? animal_name.trim() 
      : `${animal_type} #${counter}`;

    // 4. Execute MySQL Transaction for complete data consistency
    const result = await sequelize.transaction(async (t) => {
      // a. Insert Livestock Record
      const livestock = await Livestock.create({
        livestock_code,
        member_id,
        animal_name: resolvedName,
        animal_type: animal_type.trim(),
        breed: breed ? breed.trim() : 'Standard / Local',
        sex: sanitizedSex,
        date_acquired,
        birth_date: birth_date && birth_date.trim() !== '' ? birth_date : null,
        initial_weight: numWeight,
        current_weight: numCurrentWeight,
        health_status: sanitizedHealthStatus,
        estimated_value: numValue,
        archive_status: 'active'
      }, { transaction: t });

      // b. Insert Initial Weight History Record
      await LivestockWeightHistory.create({
        livestock_id: livestock.id,
        weight: numWeight,
        recorded_date: date_acquired,
        remarks: 'Initial registered intake weight'
      }, { transaction: t });

      // c. Insert Initial Health Record
      await LivestockHealthRecord.create({
        livestock_id: livestock.id,
        health_condition: sanitizedHealthStatus,
        diagnosis: 'Initial registration inspection',
        treatment: 'Standard intake assessment',
        record_date: date_acquired,
        remarks: 'Livestock registered into KAMBAC database'
      }, { transaction: t });

      return livestock;
    });

    console.log(`✅ [MySQL] Successfully registered livestock ID: ${result.id} (${result.livestock_code}) for Member #${member_id}`);

    if (isAjax) {
      return res.status(201).json({
        success: true,
        message: `Livestock ${result.livestock_code} (${result.animal_name}) registered successfully!`,
        data: result
      });
    }

    req.flash('success_msg', `Livestock ${result.livestock_code} (${result.animal_name}) registered successfully!`);
    return res.redirect('/dashboard');

  } catch (error) {
    console.error('❌ [MySQL] Create livestock error:', error);
    
    // Check for duplicate key constraint
    if (error.name === 'SequelizeUniqueConstraintError') {
      const msg = 'A livestock record with this identifier already exists.';
      if (isAjax) return res.status(409).json({ success: false, message: msg });
      req.flash('error_msg', msg);
      return res.redirect('/dashboard');
    }

    // Check for foreign key constraint
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      const msg = 'Invalid member specified. Foreign key constraint failed.';
      if (isAjax) return res.status(400).json({ success: false, message: msg });
      req.flash('error_msg', msg);
      return res.redirect('/dashboard');
    }

    const clientMsg = 'Failed to register livestock: ' + (error.message || 'Database error occurred.');
    if (isAjax) return res.status(500).json({ success: false, message: clientMsg });
    req.flash('error_msg', clientMsg);
    return res.redirect('/dashboard');
  }
};

/**
 * Get Single Livestock Details (JSON for View Modal)
 */
export const getDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Livestock.findByPk(id, {
      include: [
        { model: Member, as: 'owner' },
        { model: LivestockHealthRecord, as: 'healthRecords' },
        { model: LivestockWeightHistory, as: 'weightHistory' },
        { model: LivestockArchiveHistory, as: 'archiveHistory' }
      ],
      order: [
        [{ model: LivestockHealthRecord, as: 'healthRecords' }, 'record_date', 'DESC'],
        [{ model: LivestockWeightHistory, as: 'weightHistory' }, 'recorded_date', 'DESC']
      ]
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Livestock not found' });
    }

    const data = item.toJSON();
    data.age = formatAge(data.birth_date, data.date_acquired);
    data.formatted_value = Number(data.estimated_value).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get livestock details error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Livestock Information
 */
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      animal_name,
      animal_type,
      breed,
      sex,
      current_weight,
      health_status,
      estimated_value,
      weight_remarks,
      health_treatment,
      health_remarks
    } = req.body;

    const livestock = await Livestock.findByPk(id);
    if (!livestock) {
      req.flash('error_msg', 'Livestock record not found');
      return res.redirect('/dashboard');
    }

    const previousWeight = Number(livestock.current_weight);
    const newWeight = parseFloat(current_weight) || previousWeight;
    const previousHealth = livestock.health_status;

    // Update main livestock record
    await livestock.update({
      animal_name: animal_name || livestock.animal_name,
      animal_type: animal_type || livestock.animal_type,
      breed: breed || livestock.breed,
      sex: sex || livestock.sex,
      current_weight: newWeight,
      health_status: health_status || livestock.health_status,
      estimated_value: parseFloat(estimated_value) || livestock.estimated_value
    });

    const today = new Date().toISOString().split('T')[0];

    // If weight changed, log into weight history
    if (newWeight !== previousWeight) {
      await LivestockWeightHistory.create({
        livestock_id: livestock.id,
        weight: newWeight,
        recorded_date: today,
        remarks: weight_remarks || `Weight updated from ${previousWeight} kg to ${newWeight} kg`
      });
    }

    // If health condition or treatment provided, log into health records
    if (health_treatment || (health_status && health_status !== previousHealth)) {
      await LivestockHealthRecord.create({
        livestock_id: livestock.id,
        health_condition: health_status || livestock.health_status,
        diagnosis: `Condition check: ${health_status || livestock.health_status}`,
        treatment: health_treatment || 'Routine observation',
        record_date: today,
        remarks: health_remarks || `Status updated from ${previousHealth} to ${health_status}`
      });
    }

    req.flash('success_msg', `Livestock ${livestock.livestock_code} updated successfully!`);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Update livestock error:', error);
    req.flash('error_msg', 'Failed to update livestock: ' + error.message);
    res.redirect('/dashboard');
  }
};

/**
 * Archive Livestock (Soft archive: status set to 'archived')
 */
export const archive = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const livestock = await Livestock.findByPk(id);
    if (!livestock) {
      req.flash('error_msg', 'Livestock not found');
      return res.redirect('/dashboard');
    }

    // Set archive status
    await livestock.update({ archive_status: 'archived' });

    // Record in archive history
    await LivestockArchiveHistory.create({
      livestock_id: livestock.id,
      action: 'archived',
      reason: reason || 'Archived by user',
      action_date: new Date(),
      performed_by: req.session?.user?.name || 'Administrator'
    });

    req.flash('success_msg', `Livestock ${livestock.livestock_code} has been moved to archive.`);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Archive livestock error:', error);
    req.flash('error_msg', 'Failed to archive livestock: ' + error.message);
    res.redirect('/dashboard');
  }
};

/**
 * Archived Livestock Section View
 */
export const archivedList = async (req, res) => {
  try {
    const archivedItems = await Livestock.findAll({
      where: { archive_status: 'archived' },
      include: [
        { model: Member, as: 'owner' },
        { model: LivestockArchiveHistory, as: 'archiveHistory' }
      ],
      order: [['updated_at', 'DESC']]
    });

    const formattedList = archivedItems.map(item => {
      const plain = item.toJSON();
      const latestArchive = plain.archiveHistory && plain.archiveHistory.length > 0
        ? plain.archiveHistory[plain.archiveHistory.length - 1]
        : null;
      plain.archive_date = latestArchive ? new Date(latestArchive.action_date).toLocaleDateString() : 'N/A';
      plain.archive_reason = latestArchive ? latestArchive.reason : 'Archived';
      plain.formatted_value = Number(plain.estimated_value).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return plain;
    });

    res.render('livestock/archived', {
      title: 'Archived Livestock - KAMBAC',
      archivedItems: formattedList,
      activeNav: 'archived'
    });
  } catch (error) {
    console.error('Archived list error:', error);
    req.flash('error_msg', 'Failed to load archived records');
    res.redirect('/dashboard');
  }
};

/**
 * Restore Archived Livestock
 */
export const restore = async (req, res) => {
  try {
    const { id } = req.params;
    const livestock = await Livestock.findByPk(id);

    if (!livestock) {
      req.flash('error_msg', 'Livestock not found');
      return res.redirect('/livestock/archived');
    }

    await livestock.update({ archive_status: 'active' });

    await LivestockArchiveHistory.create({
      livestock_id: livestock.id,
      action: 'restored',
      reason: 'Restored back to active herd',
      action_date: new Date(),
      performed_by: req.session?.user?.name || 'Administrator'
    });

    req.flash('success_msg', `Livestock ${livestock.livestock_code} restored to active list!`);
    res.redirect('/livestock/archived');
  } catch (error) {
    console.error('Restore livestock error:', error);
    req.flash('error_msg', 'Failed to restore livestock: ' + error.message);
    res.redirect('/livestock/archived');
  }
};
