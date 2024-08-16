import { AppSettingConfig } from "@/types/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import log from "electron-log/renderer";
import store from "./store";

let initialState: AppSettingConfig = {
    aiTagEnable: false,
    aiTagByImage: false,
    openaiConfig: {
        apiHost: "",
        apiKey: "",
        model: "",
    }
}

const appSettingConfigSlice = createSlice({
    name: 'AppSettingConfig',
    initialState,
    reducers: {
        setAppSettingConfig: (state, action: PayloadAction<AppSettingConfig>) => {
            log.info('setConfig', action.payload);
            return action.payload;
        },
        updateAppSettingConfig: (state, action: PayloadAction<Partial<AppSettingConfig>>) => {
            const newState = { ...state, ...action.payload };
            window.ipc.send('setting:saveConfig', JSON.stringify(newState));
            return newState;
        },
    },
});

export const appSettingConfigReducer = appSettingConfigSlice.reducer;
export const { setAppSettingConfig, updateAppSettingConfig } = appSettingConfigSlice.actions;

// 通过 IPC 请求从 main 进程获取配置文件
async function fetchInitialState() {
    try {
        const config = await window.ipc.invoke('setting:loadConfig');
        if (config) {
            store.dispatch(setAppSettingConfig(config));
        }
    } catch (error) {
        log.error('Failed to fetch initial state:', error);
    }
}

fetchInitialState();