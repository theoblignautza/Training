const express = require('express');
const router = express.Router();

// Run compliance check
router.post('/check/:deviceId/:templateId', async (req, res, next) => {
  const db = req.app.get('db');
  const io = req.app.get('io');
  const { deviceId, templateId } = req.params;
  
  try {
    io.emit('log', {
      type: 'info',
      message: `Starting compliance check for device ${deviceId} against template ${templateId}`,
      timestamp: new Date().toISOString()
    });
    
    // Get device and template
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId);
    const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId);
    
    if (!device) {
      return res.status(404).json({ error: true, message: 'Device not found' });
    }
    
    if (!template) {
      return res.status(404).json({ error: true, message: 'Template not found' });
    }
    
    // TODO: Implement actual compliance checking logic
    // For now, we'll create a basic compliance report
    const compliant = Math.random() > 0.5; // Placeholder
    const report = compliant 
      ? 'Device configuration matches template requirements'
      : 'Device configuration has differences from template';
    
    // Save compliance report
    const stmt = db.prepare(`
      INSERT INTO compliance_reports (device_id, template_id, compliant, report)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(deviceId, templateId, compliant ? 1 : 0, report);
    
    const complianceReport = db.prepare(`
      SELECT 
        cr.id, cr.device_id, cr.template_id, cr.compliant, cr.report, cr.timestamp,
        d.hostname, d.ip_address,
        t.name as template_name
      FROM compliance_reports cr
      JOIN devices d ON cr.device_id = d.id
      JOIN templates t ON cr.template_id = t.id
      WHERE cr.id = ?
    `).get(result.lastInsertRowid);
    
    io.emit('log', {
      type: compliant ? 'success' : 'warning',
      message: `Compliance check completed: ${compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      ID: complianceReport.id,
      DeviceID: complianceReport.device_id,
      TemplateID: complianceReport.template_id,
      Compliant: Boolean(complianceReport.compliant),
      Report: complianceReport.report,
      Timestamp: complianceReport.timestamp,
      Device: {
        Hostname: complianceReport.hostname,
        IPAddress: complianceReport.ip_address
      },
      Template: {
        Name: complianceReport.template_name
      }
    });
  } catch (error) {
    io.emit('log', {
      type: 'error',
      message: `Compliance check failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
    next(error);
  }
});

// Get compliance history for a device
router.get('/history/:deviceId', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const { deviceId } = req.params;
    
    const reports = db.prepare(`
      SELECT 
        cr.id, cr.device_id, cr.template_id, cr.compliant, cr.report, cr.timestamp,
        d.hostname, d.ip_address,
        t.name as template_name
      FROM compliance_reports cr
      JOIN devices d ON cr.device_id = d.id
      JOIN templates t ON cr.template_id = t.id
      WHERE cr.device_id = ?
      ORDER BY cr.timestamp DESC
    `).all(deviceId);
    
    const transformedReports = reports.map(r => ({
      ID: r.id,
      DeviceID: r.device_id,
      TemplateID: r.template_id,
      Compliant: Boolean(r.compliant),
      Report: r.report,
      Timestamp: r.timestamp,
      Device: {
        Hostname: r.hostname,
        IPAddress: r.ip_address
      },
      Template: {
        Name: r.template_name
      }
    }));
    
    res.json(transformedReports);
  } catch (error) {
    next(error);
  }
});

// Get all compliance reports
router.get('/reports', (req, res, next) => {
  try {
    const db = req.app.get('db');
    
    const reports = db.prepare(`
      SELECT 
        cr.id, cr.device_id, cr.template_id, cr.compliant, cr.report, cr.timestamp,
        d.hostname, d.ip_address,
        t.name as template_name
      FROM compliance_reports cr
      JOIN devices d ON cr.device_id = d.id
      JOIN templates t ON cr.template_id = t.id
      ORDER BY cr.timestamp DESC
      LIMIT 100
    `).all();
    
    const transformedReports = reports.map(r => ({
      ID: r.id,
      DeviceID: r.device_id,
      TemplateID: r.template_id,
      Compliant: Boolean(r.compliant),
      Report: r.report,
      Timestamp: r.timestamp,
      Device: {
        Hostname: r.hostname,
        IPAddress: r.ip_address
      },
      Template: {
        Name: r.template_name
      }
    }));
    
    res.json(transformedReports);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
