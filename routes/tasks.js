import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import * as store from '../lib/store.js';
import { scheduleTask, unscheduleTask, runTask } from '../lib/scheduler.js';

const router = express.Router();

// POST /tasks — create a new task
router.post('/', (req, res) => {
  const { name, schedule, command } = req.body;

  if (!name || !schedule || !command) {
    return res.status(400).json({ error: 'name, schedule, and command are required' });
  }

  if (!cron.validate(schedule)) {
    return res.status(400).json({ error: `Invalid cron expression: "${schedule}"` });
  }

  const task = {
    id: uuidv4(),
    name,
    schedule,
    command,
    status: 'active',
    createdAt: new Date().toISOString(),
    lastRun: null,
    lastResult: null,
  };

  store.save(task);
  scheduleTask(task);

  res.status(201).json(task);
});

// GET /tasks — list all tasks
router.get('/', (req, res) => {
  res.json(store.getAll());
});

// GET /tasks/:id — get one task
router.get('/:id', (req, res) => {
  const task = store.getById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// PATCH /tasks/:id — update status (active/paused) or other fields
router.patch('/:id', (req, res) => {
  const task = store.getById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { name, schedule, command, status } = req.body;

  if (schedule && !cron.validate(schedule)) {
    return res.status(400).json({ error: `Invalid cron expression: "${schedule}"` });
  }

  if (name) task.name = name;
  if (schedule) task.schedule = schedule;
  if (command) task.command = command;
  if (status && ['active', 'paused'].includes(status)) task.status = status;

  store.save(task);
  scheduleTask(task); // reschedule (or stop if paused)

  res.json(task);
});

// POST /tasks/:id/run — trigger a task immediately (outside schedule)
router.post('/:id/run', async (req, res) => {
  const task = store.getById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const result = await runTask(task);
  res.json({ taskId: task.id, ...result });
});

// DELETE /tasks/:id — remove a task
router.delete('/:id', (req, res) => {
  const task = store.getById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  unscheduleTask(req.params.id);
  store.remove(req.params.id);

  res.status(204).send();
});

export default router;
