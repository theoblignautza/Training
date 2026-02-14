const express = require('express');
const router = express.Router();
const { startSchedule } = require('../utils/backup-scheduler');

function buildCronExpression(time, days) {
  if (!time || !Array.isArray(days) || days.length === 0) {
    throw new Error('time and days are required to build cron expression');
  }

  const [hourStr, minuteStr] = time.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error('Invalid time format, expected HH:mm');
  }

  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayValues = days.map((day) => dayMap[day]).filter((d) => d !== undefined);

  if (!dayValues.length) {
    throw new Error('At least one valid weekday is required');
  }

  return `${minute} ${hour} * * ${dayValues.join(',')}`;
}

router.get('/', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const schedules = db.prepare(`SELECT * FROM backup_schedules ORDER BY created_at DESC`).all();

    res.json(schedules.map((s) => ({
      ID: s.id,
      Name: s.name,
      CronExpression: s.cron_expression,
      DeviceIDs: s.device_ids ? JSON.parse(s.device_ids) : null,
      Enabled: Boolean(s.enabled),
      LastRun: s.last_run,
      NextRun: s.next_run,
      CreatedAt: s.created_at
    })));
  } catch (error) {
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { name, cronExpression, deviceIds, time, days } = req.body;

    let finalCron = cronExpression;
    if (!finalCron && time && days) {
      finalCron = buildCronExpression(time, days);
    }

    if (!name || !finalCron) {
      return res.status(400).json({ error: true, message: 'Name and cron expression required' });
    }

    const result = db.prepare(`
      INSERT INTO backup_schedules (name, cron_expression, device_ids)
      VALUES (?, ?, ?)
    `).run(name, finalCron, deviceIds ? JSON.stringify(deviceIds) : null);

    const schedule = db.prepare(`SELECT * FROM backup_schedules WHERE id = ?`).get(result.lastInsertRowid);
    startSchedule(schedule, db, io);

    io.emit('log', {
      type: 'success',
      message: `Backup schedule created: ${name} (${finalCron})`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      ID: schedule.id,
      Name: schedule.name,
      CronExpression: schedule.cron_expression,
      Enabled: Boolean(schedule.enabled)
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const db = req.app.get('db');
    db.prepare('DELETE FROM backup_schedules WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/queue', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const queue = db.prepare(`
      SELECT bq.*, d.hostname, d.ip_address
      FROM backup_queue bq
      JOIN devices d ON bq.device_id = d.id
      ORDER BY bq.created_at DESC
      LIMIT 50
    `).all();

    res.json(queue.map((q) => ({
      ID: q.id,
      DeviceID: q.device_id,
      Hostname: q.hostname,
      IPAddress: q.ip_address,
      Status: q.status,
      Progress: q.progress,
      ErrorMessage: q.error_message,
      StartedAt: q.started_at,
      CompletedAt: q.completed_at
    })));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
