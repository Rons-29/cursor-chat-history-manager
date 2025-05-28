"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
class ConfigService {
    constructor(configPath) {
        this.configPath = configPath || path_1.default.join(os_1.default.homedir(), '.cursor-chat-history', 'config.json');
        this.defaultConfig = {
            storageType: 'file',
            storagePath: path_1.default.join(os_1.default.homedir(), '.cursor-chat-history'),
            maxSessions: 1000,
            maxMessagesPerSession: 500,
            autoCleanup: true,
            cleanupDays: 30,
            enableSearch: true,
            enableBackup: false,
            backupInterval: 24,
            excludeKeywords: [],
            autoSaveInterval: 5,
            maxBackupFiles: 10,
            exportFormats: ['json', 'markdown', 'txt'],
            theme: 'auto',
            language: 'ja'
        };
    }
    /**
     * 設定ファイルを初期化
     */
    async initialize() {
        await fs_extra_1.default.ensureDir(path_1.default.dirname(this.configPath));
        if (!await fs_extra_1.default.pathExists(this.configPath)) {
            await this.saveConfig(this.defaultConfig);
        }
    }
    /**
     * 設定を読み込み
     */
    async loadConfig() {
        try {
            if (!await fs_extra_1.default.pathExists(this.configPath)) {
                return this.defaultConfig;
            }
            const configData = await fs_extra_1.default.readJson(this.configPath);
            // デフォルト値とマージ
            return {
                ...this.defaultConfig,
                ...configData
            };
        }
        catch (error) {
            console.warn('設定ファイルの読み込みに失敗しました。デフォルト設定を使用します:', error);
            return this.defaultConfig;
        }
    }
    /**
     * 設定を保存
     */
    async saveConfig(config) {
        try {
            const currentConfig = await this.loadConfig();
            const newConfig = {
                ...currentConfig,
                ...config
            };
            await fs_extra_1.default.ensureDir(path_1.default.dirname(this.configPath));
            await fs_extra_1.default.writeJson(this.configPath, newConfig, { spaces: 2 });
        }
        catch (error) {
            throw new Error(`設定の保存に失敗しました: ${error}`);
        }
    }
    /**
     * 特定の設定値を取得
     */
    async getConfigValue(key) {
        const config = await this.loadConfig();
        return config[key];
    }
    /**
     * 特定の設定値を更新
     */
    async updateConfigValue(key, value) {
        const config = await this.loadConfig();
        config[key] = value;
        await this.saveConfig(config);
    }
    /**
     * 設定をデフォルトにリセット
     */
    async resetToDefault() {
        await this.saveConfig(this.defaultConfig);
    }
    /**
     * 設定ファイルのパスを取得
     */
    getConfigPath() {
        return this.configPath;
    }
    /**
     * デフォルト設定を取得
     */
    getDefaultConfig() {
        return { ...this.defaultConfig };
    }
    /**
     * 設定の検証
     */
    validateConfig(config) {
        const errors = [];
        if (config.maxSessions !== undefined && (config.maxSessions < 1 || config.maxSessions > 10000)) {
            errors.push('maxSessions は 1 から 10000 の間で設定してください');
        }
        if (config.maxMessagesPerSession !== undefined && (config.maxMessagesPerSession < 1 || config.maxMessagesPerSession > 1000)) {
            errors.push('maxMessagesPerSession は 1 から 1000 の間で設定してください');
        }
        if (config.cleanupDays !== undefined && (config.cleanupDays < 1 || config.cleanupDays > 365)) {
            errors.push('cleanupDays は 1 から 365 の間で設定してください');
        }
        if (config.backupInterval !== undefined && (config.backupInterval < 1 || config.backupInterval > 168)) {
            errors.push('backupInterval は 1 から 168 時間の間で設定してください');
        }
        if (config.autoSaveInterval !== undefined && (config.autoSaveInterval < 1 || config.autoSaveInterval > 60)) {
            errors.push('autoSaveInterval は 1 から 60 分の間で設定してください');
        }
        if (config.maxBackupFiles !== undefined && (config.maxBackupFiles < 1 || config.maxBackupFiles > 100)) {
            errors.push('maxBackupFiles は 1 から 100 の間で設定してください');
        }
        if (config.theme !== undefined && !['light', 'dark', 'auto'].includes(config.theme)) {
            errors.push('theme は light, dark, auto のいずれかを設定してください');
        }
        if (config.language !== undefined && !['ja', 'en'].includes(config.language)) {
            errors.push('language は ja または en を設定してください');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    /**
     * 設定のエクスポート
     */
    async exportConfig(exportPath) {
        const config = await this.loadConfig();
        await fs_extra_1.default.writeJson(exportPath, config, { spaces: 2 });
    }
    /**
     * 設定のインポート
     */
    async importConfig(importPath, validate = true) {
        try {
            if (!await fs_extra_1.default.pathExists(importPath)) {
                return { success: false, errors: ['インポートファイルが見つかりません'] };
            }
            const importedConfig = await fs_extra_1.default.readJson(importPath);
            if (validate) {
                const validation = this.validateConfig(importedConfig);
                if (!validation.valid) {
                    return { success: false, errors: validation.errors };
                }
            }
            await this.saveConfig(importedConfig);
            return { success: true, errors: [] };
        }
        catch (error) {
            return { success: false, errors: [`設定のインポートに失敗しました: ${error}`] };
        }
    }
}
exports.ConfigService = ConfigService;
//# sourceMappingURL=ConfigService.js.map