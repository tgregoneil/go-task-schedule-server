import cron from 'node-cron';
import { exec } from 'node:child_process';
import * as store from './store.js';

const activeJobs = {};

export function runTask(task) {
  return new Promise((resolve) => {
    const startedAt = new Date().toISOString();
    exec(task.command, { timeout: 60000 }, (error, stdout, stderr) => {
      const result = {
        startedAt,
        completedAt: new Date().toISOString(),
        exitCode: error ? (error.code ?? 1) : 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };

      const fresh = store.getById(task.id);
      if (fresh) {
        fresh.lastRun = result.startedAt;
        fresh.lastResult = result;
        // Preserve 'paused' across manual runs so a one-off test doesn't silently
        // resume the task. Only flip between 'active' and 'failed' otherwise.
        if (fresh.status !== 'paused') {
          fresh.status = result.exitCode === 0 ? 'active' : 'failed';
        }
        store.save(fresh);
      }

      console.log(`[${new Date().toISOString()}] Task "${task.name}" exited ${result.exitCode}`);
      resolve(result);
    });
  });
}

export function scheduleTask(task) {
  if (activeJobs[task.id]) {
    activeJobs[task.id].stop();
    delete activeJobs[task.id];
  }

  if (task.status === 'paused') return;

  if (!cron.validate(task.schedule)) {
    console.warn(`Invalid cron expression for task "${task.name}": ${task.schedule}`);
    return;
  }

  const job = cron.schedule(task.schedule, () => runTask(task));
  activeJobs[task.id] = job;
  console.log(`Scheduled task "${task.name}" [${task.schedule}]`);
}

export function unscheduleTask(id) {
  if (activeJobs[id]) {
    activeJobs[id].stop();
    delete activeJobs[id];
  }
}

export function initScheduler() {
  const tasks = store.getAll();
  console.log(`Rehydrating ${tasks.length} task(s) from disk...`);
  tasks.forEach(scheduleTask);
}
