const express = require('express');
const {
  getAdminSettings,
  updateSchedule,
  updateBackupSettings,
  addApiKey,
  updateApiKey,
  deleteApiKey,
  getAdminDashboard,
  runAutoNow,
  runBackupNow,
  testBackupTelegram,
  stopAutoRun,
  getDomainActivityLogs,
  getAutoCheckLogs,
} = require('../controllers/adminController');

const router = express.Router();

router.get('/settings', getAdminSettings);
router.patch('/settings/schedule', updateSchedule);
router.patch('/settings/backup', updateBackupSettings);
router.post('/settings/keys', addApiKey);
router.patch('/settings/keys/:keyId', updateApiKey);
router.delete('/settings/keys/:keyId', deleteApiKey);
router.get('/dashboard', getAdminDashboard);
router.get('/domain-logs', getDomainActivityLogs);
router.get('/auto-check-logs', getAutoCheckLogs);
router.post('/run-now', runAutoNow);
router.post('/backup/run-now', runBackupNow);
router.post('/backup/test-telegram', testBackupTelegram);
router.post('/stop-run', stopAutoRun);

module.exports = router;
