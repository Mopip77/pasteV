"use client";
import { ClipboardHisotryEntity } from "@/lib/schemes";
import React, { useState, useEffect } from "react";

interface ClipboardDisplayItem extends ClipboardHisotryEntity {
  displayText: string;
}

const Content = () => {
  const [histories, setHistories] = useState<ClipboardDisplayItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [mouseUpIndex, setMouseIndex] = useState<number>(-1);

  useEffect(() => {
    global.window.ipc
      .invoke("clipboard:query", { offset: 0, size: 100 })
      .then((_histories: ClipboardHisotryEntity[]) => {
        const displayItems: ClipboardDisplayItem[] = _histories.map(
          (history) => ({
            ...history,
            displayText: generateSummary(history),
          })
        );
        setHistories(displayItems);
      });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        setSelectedIndex((prevIndex) =>
          Math.min(prevIndex + 1, histories.length - 1)
        );
      } else if (event.key === "ArrowUp") {
        setSelectedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [histories]);

  const generateSummary = (item: ClipboardHisotryEntity): string => {
    return item.type === "image" ? "Image..." : item.text;
  };

  const renderDetail = (item: ClipboardDisplayItem) => {
    if (item?.type === "image" && item.blob) {
      const base64String = Buffer.from(item.blob).toString("base64");
      return <img src={`data:image/png;base64,${base64String}`} alt="Detail" />;
    } else {
      return <div>{item?.text}</div>;
    }
  };

  return (
    <div className="flex divide-x divide-gray-200">
      <ul className="w-2/5">
        {histories.length > 0 &&
          histories.map((item, index) => (
            <li
              key={item.id}
              className={`py-[4px] truncate ${
                index === mouseUpIndex ? "bg-blue-200" : ""
              } ${index === selectedIndex ? "bg-blue-400" : ""}`}
              onMouseOver={() => {
                setMouseIndex(index);
              }}
              onClick={() => {
                setSelectedIndex(index);
              }}
            >
              {item.displayText}
            </li>
          ))}
      </ul>
      <div className="w-3/5">
        {selectedIndex >= 0 && renderDetail(histories[selectedIndex])}
      </div>
    </div>
  );
};

export default Content;
