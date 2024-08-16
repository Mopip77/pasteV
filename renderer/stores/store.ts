import { configureStore } from '@reduxjs/toolkit';
import { appSettingConfigReducer } from './appSettingConfigSlice';


// 创建 Redux store
const store = configureStore({
    reducer: {
        appSettingConfig: appSettingConfigReducer
    },
});

export type RootState = ReturnType<typeof store.getState>;
export default store;