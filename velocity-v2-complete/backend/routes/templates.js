const express = require('express');
const router = express.Router();

// Get all templates
router.get('/', (req, res, next) => {
  try {
    const db = req.app.get('db');
    
    const templates = db.prepare(`
      SELECT id, name, content, description, created_at, updated_at
      FROM templates
      ORDER BY name
    `).all();
    
    const transformedTemplates = templates.map(t => ({
      ID: t.id,
      Name: t.name,
      Content: t.content,
      Description: t.description,
      CreatedAt: t.created_at,
      UpdatedAt: t.updated_at
    }));
    
    res.json(transformedTemplates);
  } catch (error) {
    next(error);
  }
});

// Get single template
router.get('/:id', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    
    const template = db.prepare(`
      SELECT id, name, content, description, created_at, updated_at
      FROM templates
      WHERE id = ?
    `).get(id);
    
    if (!template) {
      return res.status(404).json({ error: true, message: 'Template not found' });
    }
    
    res.json({
      ID: template.id,
      Name: template.name,
      Content: template.content,
      Description: template.description,
      CreatedAt: template.created_at,
      UpdatedAt: template.updated_at
    });
  } catch (error) {
    next(error);
  }
});

// Add new template
router.post('/', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { Name, Content, Description } = req.body;
    
    if (!Name || !Content) {
      return res.status(400).json({ 
        error: true, 
        message: 'Missing required fields: Name, Content' 
      });
    }
    
    const stmt = db.prepare(`
      INSERT INTO templates (name, content, description)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(Name, Content, Description || null);
    
    const newTemplate = db.prepare(`
      SELECT id, name, content, description, created_at, updated_at
      FROM templates
      WHERE id = ?
    `).get(result.lastInsertRowid);
    
    io.emit('log', {
      type: 'success',
      message: `Template created: ${Name}`,
      timestamp: new Date().toISOString()
    });
    
    res.status(201).json({
      ID: newTemplate.id,
      Name: newTemplate.name,
      Content: newTemplate.content,
      Description: newTemplate.description,
      CreatedAt: newTemplate.created_at,
      UpdatedAt: newTemplate.updated_at
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ 
        error: true, 
        message: 'A template with this name already exists' 
      });
    }
    next(error);
  }
});

// Update template
router.put('/:id', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { id } = req.params;
    const updates = req.body;
    
    const existing = db.prepare('SELECT id FROM templates WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: true, message: 'Template not found' });
    }
    
    const allowedFields = {
      'Name': 'name',
      'Content': 'content',
      'Description': 'description'
    };
    
    const updateFields = [];
    const values = [];
    
    for (const [key, dbField] of Object.entries(allowedFields)) {
      if (updates[key] !== undefined) {
        updateFields.push(`${dbField} = ?`);
        values.push(updates[key]);
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ 
        error: true, 
        message: 'No valid fields to update' 
      });
    }
    
    updateFields.push('updated_at = datetime(\'now\')');
    values.push(id);
    
    const stmt = db.prepare(`
      UPDATE templates
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...values);
    
    const updated = db.prepare(`
      SELECT id, name, content, description, created_at, updated_at
      FROM templates
      WHERE id = ?
    `).get(id);
    
    io.emit('log', {
      type: 'info',
      message: `Template updated: ${updated.name}`,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      ID: updated.id,
      Name: updated.name,
      Content: updated.content,
      Description: updated.description,
      CreatedAt: updated.created_at,
      UpdatedAt: updated.updated_at
    });
  } catch (error) {
    next(error);
  }
});

// Delete template
router.delete('/:id', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { id } = req.params;
    
    const template = db.prepare('SELECT name FROM templates WHERE id = ?').get(id);
    if (!template) {
      return res.status(404).json({ error: true, message: 'Template not found' });
    }
    
    const stmt = db.prepare('DELETE FROM templates WHERE id = ?');
    stmt.run(id);
    
    io.emit('log', {
      type: 'warning',
      message: `Template deleted: ${template.name}`,
      timestamp: new Date().toISOString()
    });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
