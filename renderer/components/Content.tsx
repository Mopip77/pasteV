"use client";
import { ClipboardHisotryEntity } from '@/lib/schemes';
import React, { useState, useEffect } from 'react';

interface ClipboardDisplayItem extends ClipboardHisotryEntity {
  displayText: string;
}

const Content = () => {
  const [histories, setHistories] = useState<ClipboardDisplayItem[]>([]);
  const [currentDetail, setCurrentDetail] = useState<ClipboardDisplayItem>();

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

  const renderDetail = () => {
    if (currentDetail?.type === 'image' && currentDetail.blob) {
      const base64String = Buffer.from(currentDetail.blob).toString('base64');
      return <img src={`data:image/png;base64,${base64String}`} alt="Detail" />;
    } else {
      return <div>{currentDetail?.text}</div>;
    }
  };

  return (
    <div className="flex divide-x divide-gray-200">
      <ul className="w-2/5">
        {histories.length > 0 &&
          histories.map((item) => (
            <li
              key={item.id}
              className={`py-[4px] truncate ${currentDetail === item ? 'bg-blue-200' : ''}`}
              onMouseOver={() => {
                setCurrentDetail(item);
              }}
              onClick={() => {
                setCurrentDetail(item);
              }}
            >
              ({item.type}){item.displayText}
            </li>
          ))}
      </ul>
      <div className="w-3/5">
        {currentDetail && renderDetail()}
      </div>
    </div>
  );
};

export default Content;
