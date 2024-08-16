"use client";
import dynamic from "next/dynamic";

const SettingsPage = () => {
  const SettingWithoutSSR = dynamic(() => import("@/components/AppSetting"), {
    ssr: false,
  });
  return <SettingWithoutSSR />;
};

export default SettingsPage;
