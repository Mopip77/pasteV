"use client";
import { ClipboardHisotryEntity } from "@/lib/schemes";
import React, { useState, useEffect } from "react";
import styled from "styled-components";

const HidePointerUl = styled.ul<{ hidePointer: boolean }>`
  ${(props) => props.hidePointer && "cursor: none;"}
`;

const Content = () => {
  const [histories, setHistories] = useState<ClipboardHisotryEntity[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [mouseUpIndex, setMouseIndex] = useState<number>(-1);
  const [hidePointer, setHidePointer] = useState<boolean>(false);

  useEffect(() => {
    global.window.ipc
      .invoke("clipboard:query", { offset: 0, size: 100 })
      .then((_histories: ClipboardHisotryEntity[]) => {
        setHistories(_histories);
      });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        setSelectedIndex((prevIndex) =>
          Math.min(prevIndex + 1, histories.length - 1)
        );
        setHidePointer(true);
        setMouseIndex(-1);
      } else if (event.key === "ArrowUp") {
        setSelectedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
        setHidePointer(true);
        setMouseIndex(-1);
      }
    };

    const handleMouseMove = () => {
      setHidePointer(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [histories]);

  const generateSummary = (item: ClipboardHisotryEntity): string => {
    return item.type === "image" ? "Image..." : item.text;
  };

  const renderDetail = (item: ClipboardHisotryEntity) => {
    if (item?.type === "image" && item.blob) {
      const base64String = Buffer.from(item.blob).toString("base64");
      return <img src={`data:image/png;base64,${base64String}`} alt="Detail" />;
    } else {
      return <div>{item?.text}</div>;
    }
  };

  return (
    <div className="flex h-full divide-x divide-gray-200">
      <HidePointerUl hidePointer={hidePointer} className="w-2/5 overflow-y-scroll">
        {histories.length > 0 &&
          histories.map((item, index) => (
            <li
              key={item.id}
              className={`h-10 py-[4px] pl-2 flex items-center truncate ${
                index === mouseUpIndex ? "bg-blue-200" : ""
              } ${index === selectedIndex ? "bg-blue-400" : ""}`}
              onMouseOver={() => {
                hidePointer || setMouseIndex(index);
              }}
              onMouseOut={() => {
                setMouseIndex(-1);
              }}
              onClick={() => {
                setSelectedIndex(index);
              }}
            >
              {generateSummary(item)}
            </li>
          ))}
      </HidePointerUl>
      <div className="w-3/5">
        {selectedIndex >= 0 && renderDetail(histories[selectedIndex])}
      </div>
    </div>
  );
};

export default Content;