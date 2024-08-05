"use client";
import { ClipboardHisotryEntity } from "@/lib/schemes";
import { useEffect, useState } from "react";

interface ClipboardDisplayItem extends ClipboardHisotryEntity {
  displayText: string;
}

const Content = () => {
  const [histories, setHistories] = useState<ClipboardDisplayItem[]>([]);

  useEffect(() => {
    global.window.ipc
      .invoke("clipboard:query", { offset: 0, size: 20 })
      .then((_histories: ClipboardHisotryEntity[]) => {
        const displayItems: ClipboardDisplayItem[] = _histories.map(
          (history) => ({
            ...history,
            displayText: history.type === "image" ? "Image..." : history.text,
          })
        );
        setHistories(displayItems);
      });
  }, []);

  return (
    <div className="divide-x divide-gray-700">
      <ul className=" w-2/5 divide-y divide-gray-200">
        {histories.length > 0 &&
          histories.map((item) => (
            <li
              className={`py-[4px] first truncate`}
            >
              ({item.type}){item.displayText}
            </li>
          ))}
      </ul>
      <div>
        details
      </div>
    </div>
  );
};

export default Content;
