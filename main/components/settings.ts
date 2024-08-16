import { AppSettingConfig } from "@/types/types";
import { app } from "electron";
import { existsSync, readFileSync, writeFileSync } from "original-fs";
import { join } from "path";

class Settings {

    private settings: AppSettingConfig | undefined;

    constructor() {
    }

    public init() {
        const appConfigPath = join(
            app.getPath('userData'),
            "app-config.json"
        );
        // 判断文件是否存在
        if (!existsSync(appConfigPath)) {
            return;
        }

        this.settings = JSON.parse(readFileSync(appConfigPath, 'utf-8'));
    }

    public loadConfig(): AppSettingConfig | undefined {
        return this.settings;
    }

    public saveConfig(configStr: string) {
        const appConfigPath = join(
            app.getPath('userData'),
            "app-config.json"
        );
        // 写入配置文件
        writeFileSync(appConfigPath, configStr, 'utf-8');
        this.settings = JSON.parse(configStr);
    }
}

export default Settings;