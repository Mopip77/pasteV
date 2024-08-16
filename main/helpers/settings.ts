import { AppSettingConfig } from "@/types/types";
import { app } from "electron";
import { existsSync, readFileSync, writeFileSync } from "original-fs";
import { join } from "path";

export function loadConfig(): AppSettingConfig | undefined {
    const appConfigPath = join(
        app.getPath('userData'),
        "app-config.json"
    );
    // 判断文件是否存在
    if (!existsSync(appConfigPath)) {
        return undefined;
    }

    // 读取配置文件
    return JSON.parse(readFileSync(appConfigPath, 'utf-8'));
}

export function saveConfig(configStr: string) {
    const appConfigPath = join(
        app.getPath('userData'),
        "app-config.json"
    );
    // 写入配置文件
    writeFileSync(appConfigPath, configStr, 'utf-8');
}