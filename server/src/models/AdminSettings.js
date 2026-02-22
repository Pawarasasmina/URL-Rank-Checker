const mongoose = require('mongoose');

const MIN_INTERVAL_HOURS = 15 / 60;
const MAX_INTERVAL_HOURS = 60 / 60;

const serpApiKeySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    baselineRemaining: { type: Number, default: null },
    baselineCapturedAt: { type: Date, default: null },
    lastUsedAt: { type: Date },
    exhaustedAt: { type: Date },
    lastError: { type: String, default: '' },
    lastKnownRemaining: { type: Number, default: null },
    totalRequests: { type: Number, default: 0 },
  },
  { _id: true }
);

const adminSettingsSchema = new mongoose.Schema(
  {
    autoCheckEnabled: { type: Boolean, default: false },
    checkIntervalHours: { type: Number, default: 1, min: MIN_INTERVAL_HOURS, max: MAX_INTERVAL_HOURS },
    lastAutoCheckAt: { type: Date, default: null },
    nextAutoCheckAt: { type: Date, default: null },
    autoCheckStartedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    backupEnabled: { type: Boolean, default: false },
    backupFrequency: { type: String, enum: ['daily', 'twice_weekly', 'weekly', 'monthly'], default: 'daily' },
    backupEveryDays: { type: Number, default: 1, min: 1, max: 30 },
    backupTwiceWeeklyNextGapDays: { type: Number, default: 3, min: 3, max: 4 },
    backupTimeWib: { type: String, default: '00:00' },
    backupTimeframeDays: { type: Number, default: 0 },
    backupFormat: { type: String, enum: ['json', 'ndjson'], default: 'json' },
    backupTelegramBotToken: { type: String, default: '' },
    backupTelegramChatIds: { type: [String], default: [] },
    backupStartedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lastBackupAt: { type: Date, default: null },
    nextBackupAt: { type: Date, default: null },
    lastBackupStatus: { type: String, enum: ['success', 'failed', 'idle'], default: 'idle' },
    lastBackupError: { type: String, default: '' },
    activeKeyCursor: { type: Number, default: 0 },
    serpApiKeys: { type: [serpApiKeySchema], default: [] },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);
