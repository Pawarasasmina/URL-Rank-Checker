const express = require('express');
const {
  getAdminSettings,
  updateSchedule,
  updateBackupSettings,
  updateNotificationSettings,
  addApiKey,
  updateApiKey,
  deleteApiKey,
  getAdminDashboard,
  runAutoNow,
  runBackupNow,
  testBackupTelegram,
  testNotificationTelegram,
  stopAutoRun,
  getDomainActivityLogs,
  getAutoCheckLogs,
} = require('../controllers/adminController');

const router = express.Router();

router.get('/settings', getAdminSettings);
router.patch('/settings/schedule', updateSchedule);
router.patch('/settings/backup', updateBackupSettings);
router.patch('/settings/notifications', updateNotificationSettings);
router.post('/settings/keys', addApiKey);
router.patch('/settings/keys/:keyId', updateApiKey);
router.delete('/settings/keys/:keyId', deleteApiKey);
router.get('/dashboard', getAdminDashboard);
router.get('/domain-logs', getDomainActivityLogs);
router.get('/auto-check-logs', getAutoCheckLogs);
router.post('/run-now', runAutoNow);
router.post('/backup/run-now', runBackupNow);
router.post('/backup/test-telegram', testBackupTelegram);
router.post('/notifications/test-telegram', testNotificationTelegram);
router.post('/stop-run', stopAutoRun);

module.exports = router;
