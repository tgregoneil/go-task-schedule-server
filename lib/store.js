import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../data/tasks.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}));
}

function readAll() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeAll(tasks) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
}

export function getAll() {
  return Object.values(readAll());
}

export function getById(id) {
  const tasks = readAll();
  return tasks[id] || null;
}

export function save(task) {
  const tasks = readAll();
  tasks[task.id] = task;
  writeAll(tasks);
  return task;
}

export function remove(id) {
  const tasks = readAll();
  if (!tasks[id]) return false;
  delete tasks[id];
  writeAll(tasks);
  return true;
}
