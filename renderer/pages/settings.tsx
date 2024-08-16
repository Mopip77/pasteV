"use client";
import React from "react";
import log from "electron-log/renderer";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/stores/store";
import { updateAppSettingConfig } from "@/stores/appSettingConfigSlice";

const SettingsPage = () => {
  const appSettingConfig = useSelector(
    (state: RootState) => state.appSettingConfig
  );
  const dispatch = useDispatch();

  return (
    <>
      <div>settings</div>
      <button
        onClick={() => {
          log.info("吊机按钮", !appSettingConfig.aiTagEnable);
          dispatch(
            updateAppSettingConfig({
              aiTagEnable: !appSettingConfig.aiTagEnable,
            })
          );
        }}
      >
        点击更改 aiTagEnable
      </button>
      <div>{JSON.stringify(appSettingConfig)}</div>
    </>
  );
};

export default SettingsPage;
