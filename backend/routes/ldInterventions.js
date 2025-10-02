const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// ===== INTERVENTION CATEGORIES =====

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.$queryRawUnsafe(`
      SELECT ic.*, 
             COUNT(it.id)::int as type_count
      FROM intervention_categories ic
      LEFT JOIN intervention_types it ON ic.id = it.category_id AND it.is_active = true
      GROUP BY ic.id, ic.name, ic.description, ic.color, ic.icon, ic.created_at, ic.updated_at
      ORDER BY ic.name
    `);
    res.json({ categories });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create category
router.post('/categories', async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    const id = `IC-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO intervention_categories (id, name, description, color, icon, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
      id, name.trim(), description || null, color || '#3B82F6', icon || 'BookOpen'
    );
    res.status(201).json({ message: 'Category created', category: rows[0] });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update category
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon } = req.body;
    
    const rows = await prisma.$queryRawUnsafe(
      `UPDATE intervention_categories SET 
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        color = COALESCE($4, color),
        icon = COALESCE($5, icon),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      id, name || null, description || null, color || null, icon || null
    );
    
    if (rows.length === 0) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category updated', category: rows[0] });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category has types
    const typeCount = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*)::int as count FROM intervention_types WHERE category_id = $1', id
    );
    
    if (typeCount[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category with existing intervention types' 
      });
    }
    
    const rows = await prisma.$queryRawUnsafe(
      'DELETE FROM intervention_categories WHERE id = $1 RETURNING id', id
    );
    
    if (rows.length === 0) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== INTERVENTION TYPES =====

// Get all types with category info
router.get('/types', async (req, res) => {
  try {
    const { category_id, is_active } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (category_id) {
      whereClause += ' WHERE it.category_id = $1';
      params.push(category_id);
    }
    
    if (is_active !== undefined) {
      whereClause += params.length > 0 ? ' AND' : ' WHERE';
      whereClause += ` it.is_active = $${params.length + 1}`;
      params.push(is_active === 'true');
    }
    
    const types = await prisma.$queryRawUnsafe(`
      SELECT it.*, ic.name as category_name, ic.color as category_color, ic.icon as category_icon
      FROM intervention_types it
      JOIN intervention_categories ic ON it.category_id = ic.id
      ${whereClause}
      ORDER BY ic.name, it.name
    `, ...params);
    
    res.json({ types });
  } catch (err) {
    console.error('Get types error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single type with details
router.get('/types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const types = await prisma.$queryRawUnsafe(`
      SELECT it.*, ic.name as category_name, ic.color as category_color, ic.icon as category_icon
      FROM intervention_types it
      JOIN intervention_categories ic ON it.category_id = ic.id
      WHERE it.id = $1
    `, id);
    
    if (types.length === 0) return res.status(404).json({ message: 'Type not found' });
    res.json({ type: types[0] });
  } catch (err) {
    console.error('Get type error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create type
router.post('/types', async (req, res) => {
  try {
    const { 
      category_id, name, description, duration_range, delivery_mode, 
      cost_level, complexity_level, prerequisites, learning_objectives, 
      assessment_method, certification_provided, external_provider 
    } = req.body;
    
    if (!category_id || !name || !name.trim()) {
      return res.status(400).json({ message: 'Category ID and name are required' });
    }
    
    const id = `IT-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO intervention_types (
        id, category_id, name, description, duration_range, delivery_mode,
        cost_level, complexity_level, prerequisites, learning_objectives,
        assessment_method, certification_provided, external_provider, is_active,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, NOW(), NOW()) 
      RETURNING *`,
      id, category_id, name.trim(), description || null, duration_range || null,
      delivery_mode || null, cost_level || 'MEDIUM', complexity_level || 'MEDIUM',
      prerequisites || null, learning_objectives || null, assessment_method || null,
      certification_provided || false, external_provider || null
    );
    
    res.status(201).json({ message: 'Type created', type: rows[0] });
  } catch (err) {
    console.error('Create type error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update type
router.put('/types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, description, duration_range, delivery_mode, 
      cost_level, complexity_level, prerequisites, learning_objectives, 
      assessment_method, certification_provided, external_provider, is_active 
    } = req.body;
    
    const rows = await prisma.$queryRawUnsafe(
      `UPDATE intervention_types SET 
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        duration_range = COALESCE($4, duration_range),
        delivery_mode = COALESCE($5, delivery_mode),
        cost_level = COALESCE($6, cost_level),
        complexity_level = COALESCE($7, complexity_level),
        prerequisites = COALESCE($8, prerequisites),
        learning_objectives = COALESCE($9, learning_objectives),
        assessment_method = COALESCE($10, assessment_method),
        certification_provided = COALESCE($11, certification_provided),
        external_provider = COALESCE($12, external_provider),
        is_active = COALESCE($13, is_active),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      id, name || null, description || null, duration_range || null,
      delivery_mode || null, cost_level || null, complexity_level || null,
      prerequisites || null, learning_objectives || null, assessment_method || null,
      certification_provided || null, external_provider || null, is_active || null
    );
    
    if (rows.length === 0) return res.status(404).json({ message: 'Type not found' });
    res.json({ message: 'Type updated', type: rows[0] });
  } catch (err) {
    console.error('Update type error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete type
router.delete('/types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if type has instances
    const instanceCount = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*)::int as count FROM intervention_instances WHERE intervention_type_id = $1', id
    );
    
    if (instanceCount[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete type with existing intervention instances' 
      });
    }
    
    const rows = await prisma.$queryRawUnsafe(
      'DELETE FROM intervention_types WHERE id = $1 RETURNING id', id
    );
    
    if (rows.length === 0) return res.status(404).json({ message: 'Type not found' });
    res.json({ message: 'Type deleted' });
  } catch (err) {
    console.error('Delete type error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== INTERVENTION INSTANCES =====

// Get all instances with type and category info
router.get('/instances', async (req, res) => {
  try {
    const { status, intervention_type_id } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (status) {
      whereClause += ' WHERE ii.status = $1';
      params.push(status);
    }
    
    if (intervention_type_id) {
      whereClause += params.length > 0 ? ' AND' : ' WHERE';
      whereClause += ` ii.intervention_type_id = $${params.length + 1}`;
      params.push(intervention_type_id);
    }
    
    const instances = await prisma.$queryRawUnsafe(`
      SELECT ii.*, 
             it.name as type_name, it.delivery_mode, it.duration_range,
             ic.name as category_name, ic.color as category_color,
             COUNT(ip.id)::int as participant_count
      FROM intervention_instances ii
      JOIN intervention_types it ON ii.intervention_type_id = it.id
      JOIN intervention_categories ic ON it.category_id = ic.id
      LEFT JOIN intervention_participants ip ON ii.id = ip.instance_id
      ${whereClause}
      GROUP BY ii.id, ii.intervention_type_id, ii.title, ii.description, ii.instructor,
               ii.location, ii.start_date, ii.end_date, ii.max_participants, ii.current_participants,
               ii.cost_per_participant, ii.status, ii.notes, ii.created_by, ii.created_at, ii.updated_at,
               it.name, it.delivery_mode, it.duration_range, ic.name, ic.color
      ORDER BY ii.start_date DESC, ii.created_at DESC
    `, ...params);
    
    res.json({ instances });
  } catch (err) {
    console.error('Get instances error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single instance with participants
router.get('/instances/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const instances = await prisma.$queryRawUnsafe(`
      SELECT ii.*, 
             it.name as type_name, it.delivery_mode, it.duration_range, it.description as type_description,
             ic.name as category_name, ic.color as category_color
      FROM intervention_instances ii
      JOIN intervention_types it ON ii.intervention_type_id = it.id
      JOIN intervention_categories ic ON it.category_id = ic.id
      WHERE ii.id = $1
    `, id);
    
    if (instances.length === 0) return res.status(404).json({ message: 'Instance not found' });
    
    const participants = await prisma.$queryRawUnsafe(`
      SELECT ip.*, e.first_name, e.last_name, e.sid, e.email, e.job_title, e.photo_url
      FROM intervention_participants ip
      JOIN employees e ON ip.employee_id = e.id
      WHERE ip.instance_id = $1
      ORDER BY ip.enrollment_date DESC
    `, id);
    
    res.json({ 
      instance: instances[0], 
      participants 
    });
  } catch (err) {
    console.error('Get instance error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create instance
router.post('/instances', async (req, res) => {
  try {
    const { 
      intervention_type_id, title, description, instructor, location,
      start_date, end_date, max_participants, cost_per_participant, notes, created_by 
    } = req.body;
    
    if (!intervention_type_id || !title || !title.trim()) {
      return res.status(400).json({ message: 'Intervention type ID and title are required' });
    }
    
    const id = `II-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO intervention_instances (
        id, intervention_type_id, title, description, instructor, location,
        start_date, end_date, max_participants, current_participants, cost_per_participant,
        status, notes, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::date, $9, 0, $10, 'PLANNED', $11, $12, NOW(), NOW()) 
      RETURNING *`,
      id, intervention_type_id, title.trim(), description || null, instructor || null,
      location || null, start_date || null, end_date || null, max_participants || 20,
      cost_per_participant || null, notes || null, created_by || null
    );
    
    res.status(201).json({ message: 'Instance created', instance: rows[0] });
  } catch (err) {
    console.error('Create instance error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update instance
router.put('/instances/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, description, instructor, location, start_date, end_date,
      max_participants, cost_per_participant, status, notes 
    } = req.body;
    
    const rows = await prisma.$queryRawUnsafe(
      `UPDATE intervention_instances SET 
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        instructor = COALESCE($4, instructor),
        location = COALESCE($5, location),
        start_date = COALESCE($6::date, start_date),
        end_date = COALESCE($7::date, end_date),
        max_participants = COALESCE($8, max_participants),
        cost_per_participant = COALESCE($9, cost_per_participant),
        status = COALESCE($10, status),
        notes = COALESCE($11, notes),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      id, title || null, description || null, instructor || null, location || null,
      start_date || null, end_date || null, max_participants || null,
      cost_per_participant || null, status || null, notes || null
    );
    
    if (rows.length === 0) return res.status(404).json({ message: 'Instance not found' });
    res.json({ message: 'Instance updated', instance: rows[0] });
  } catch (err) {
    console.error('Update instance error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete instance
router.delete('/instances/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const rows = await prisma.$queryRawUnsafe(
      'DELETE FROM intervention_instances WHERE id = $1 RETURNING id', id
    );
    
    if (rows.length === 0) return res.status(404).json({ message: 'Instance not found' });
    res.json({ message: 'Instance deleted' });
  } catch (err) {
    console.error('Delete instance error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== INTERVENTION PARTICIPANTS =====

// Enroll employee in intervention
router.post('/instances/:id/enroll', async (req, res) => {
  try {
    const { id: instanceId } = req.params;
    const { employee_id } = req.body;
    
    if (!employee_id) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }
    
    // Check if instance exists and has capacity
    const instance = await prisma.$queryRawUnsafe(
      'SELECT max_participants, current_participants FROM intervention_instances WHERE id = $1', instanceId
    );
    
    if (instance.length === 0) {
      return res.status(404).json({ message: 'Intervention instance not found' });
    }
    
    if (instance[0].current_participants >= instance[0].max_participants) {
      return res.status(400).json({ message: 'Intervention is full' });
    }
    
    // Check if employee is already enrolled
    const existing = await prisma.$queryRawUnsafe(
      'SELECT id FROM intervention_participants WHERE instance_id = $1 AND employee_id = $2', 
      instanceId, employee_id
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Employee is already enrolled' });
    }
    
    const participantId = `IP-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    
    await prisma.$transaction(async (tx) => {
      // Add participant
      await tx.$queryRawUnsafe(
        `INSERT INTO intervention_participants (id, instance_id, employee_id, enrollment_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), 'ENROLLED', NOW(), NOW())`,
        participantId, instanceId, employee_id
      );
      
      // Update participant count
      await tx.$queryRawUnsafe(
        'UPDATE intervention_instances SET current_participants = current_participants + 1 WHERE id = $1',
        instanceId
      );
    });
    
    res.status(201).json({ message: 'Employee enrolled successfully' });
  } catch (err) {
    console.error('Enroll employee error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update participant status
router.put('/participants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, grade, feedback, completion_date } = req.body;
    
    const rows = await prisma.$queryRawUnsafe(
      `UPDATE intervention_participants SET 
        status = COALESCE($2, status),
        grade = COALESCE($3, grade),
        feedback = COALESCE($4, feedback),
        completion_date = COALESCE($5::timestamp, completion_date),
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      id, status || null, grade || null, feedback || null, completion_date || null
    );
    
    if (rows.length === 0) return res.status(404).json({ message: 'Participant not found' });
    res.json({ message: 'Participant updated', participant: rows[0] });
  } catch (err) {
    console.error('Update participant error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove participant
router.delete('/participants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const participant = await prisma.$queryRawUnsafe(
      'SELECT instance_id FROM intervention_participants WHERE id = $1', id
    );
    
    if (participant.length === 0) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    
    await prisma.$transaction(async (tx) => {
      // Remove participant
      await tx.$queryRawUnsafe('DELETE FROM intervention_participants WHERE id = $1', id);
      
      // Update participant count
      await tx.$queryRawUnsafe(
        'UPDATE intervention_instances SET current_participants = current_participants - 1 WHERE id = $1',
        participant[0].instance_id
      );
    });
    
    res.json({ message: 'Participant removed' });
  } catch (err) {
    console.error('Remove participant error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
