import { cn } from "@/lib/utils";
import React, { useContext } from "react";
import { Separator } from "./ui/separator";
import { useSelector } from "react-redux";
import { RootState } from "@/stores/store";
import { StatsContext } from "./ClipboardHistory";

interface FooterProps {
  className?: string;
}

const Footer = ({ className = "" }: FooterProps) => {
  const appSettingConfig = useSelector(
    (state: RootState) => state.appSettingConfig
  );

  const { totalItems, currentItems, selectedIndex } = useContext(StatsContext);

  // 解析快捷键显示格式
  const parseShortcut = (shortcut: string) => {
    return shortcut
      .replace("CommandOrControl", "⌘")
      .replace("Shift", "⇧")
      .replace("Option", "⌥")
      .replace("Alt", "⌥")
      .replace("+", "");
  };

  const globalShortcut = parseShortcut(
    appSettingConfig.appWindowToggleShortcut || "⌘⇧⌥V"
  );

  return (
    <div
      className={cn(
        "w-full h-full flex items-center justify-between px-4 text-xs text-muted-foreground",
        className
      )}
    >
      {/* 左侧：统计信息 */}
      <div className="flex items-center gap-3">
        {selectedIndex >= 0 ? (
          <span className="font-semibold text-foreground">
            #{selectedIndex + 1}
          </span>
        ) : (
          <span className="font-medium">
            {currentItems > 0 ? (
              <>
                <span className="text-foreground font-semibold">{currentItems}</span>
                {totalItems > currentItems && (
                  <span className="text-muted-foreground"> / {totalItems}</span>
                )}
                <span className="ml-1">项</span>
              </>
            ) : (
              <span>无数据</span>
            )}
          </span>
        )}
      </div>

      {/* 中间：快捷键提示 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">唤醒</span>
          <kbd className="px-2 py-0.5 bg-muted rounded-md font-semibold text-foreground text-[11px] shadow-sm">
            {globalShortcut}
          </kbd>
        </div>
        <Separator orientation="vertical" className="h-3" />
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">正则</span>
          <kbd className="px-2 py-0.5 bg-muted rounded-md font-semibold text-foreground text-[11px] shadow-sm">
            ⌘I
          </kbd>
        </div>
        <Separator orientation="vertical" className="h-3" />
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">切换</span>
          <kbd className="px-2 py-0.5 bg-muted rounded-md font-semibold text-foreground text-[11px] shadow-sm">
            ⌘P
          </kbd>
        </div>
      </div>

      {/* 右侧：版本信息 */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-muted-foreground">
          PasteV <span className="text-[10px]">v1.1.0</span>
        </span>
      </div>
    </div>
  );
};

export default Footer;
