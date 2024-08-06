"use client";
import { ClipboardHisotryEntity } from "@/../main/db/schemes";
import React, { useState, useEffect, useRef, useMemo } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/default.css";
import { HIGHLIGHT_LANGUAGES } from "@/lib/consts";

interface IProps {
  searchKeyword: string;
}

const Content = ({ searchKeyword }: IProps) => {
  const [histories, setHistories] = useState<ClipboardHisotryEntity[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [mouseUpIndex, setMouseIndex] = useState<number>(-1);
  const [hidePointer, setHidePointer] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [noMoreHistory, setNoMoreHistory] = useState<boolean>(false);
  const listRefs = useRef<(HTMLLIElement | null)[]>([]);

  const batchSize = 40;

  const fetchHistory = async ({ offset = 0, size = batchSize } = {}) => {
    setLoadingHistory(true);
    const result = await global.window.ipc.invoke("clipboard:query", {
      keyword: searchKeyword,
      offset,
      size,
    });

    if (result.length !== size) {
      setNoMoreHistory(true);
    }

    setLoadingHistory(false);
    return result;
  };

  useEffect(() => {
    const initComponent = async () => {
      setSelectedIndex(-1);
      setHistories([]);
      setMouseIndex(-1);
      setHidePointer(false);
      setNoMoreHistory(false);
      fetchHistory().then((result: ClipboardHisotryEntity[]) => {
        setHistories(result);
      });
    };

    window.ipc.on("app:show", () => initComponent());
    initComponent();
  }, [searchKeyword]);

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
      } else if (event.key === "Enter") {
        console.log("entered", selectedIndex, histories[selectedIndex]);
        reCopy(histories[selectedIndex]);
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
  }, [selectedIndex, histories]);

  useEffect(() => {
    if (selectedIndex >= 0) {
      listRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  const handleUlScroll = (event: React.UIEvent<HTMLUListElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (
      scrollTop + clientHeight >= scrollHeight - 10 &&
      !loadingHistory &&
      !noMoreHistory
    ) {
      fetchHistory({
        offset: histories.length,
        size: batchSize,
      }).then((moreHistories: ClipboardHisotryEntity[]) => {
        setHistories((prevHistories) => [...prevHistories, ...moreHistories]);
      });
    }
  };

  const reCopy = async (item: ClipboardHisotryEntity) => {
    console.debug("reCopy, item=", item);
    window.ipc.invoke("clipboard:add", item);
    window.ipc.send("app:hide", "");
  };

  const generateSummary = (item: ClipboardHisotryEntity): string => {
    return item.type === "image" ? "Image..." : item.text;
  };

  const renderDetail = (item: ClipboardHisotryEntity) => {
    if (item?.type === "image" && item.blob) {
      const base64String = Buffer.from(item.blob).toString("base64");
      return <img src={`data:image/png;base64,${base64String}`} alt="Detail" />;
    } else {
      const display = item.text;
      // const highlightResult = hljs.highlightAuto(item?.text);
      // console.debug("highlightResult, ", highlightResult);
      // const display =
      //   highlightResult.errorRaised ||
      //   !HIGHLIGHT_LANGUAGES.includes(highlightResult.language) ? (
      //     item.text
      //   ) : (
      //     <code
      //       dangerouslySetInnerHTML={{ __html: highlightResult.value }}
      //     ></code>
      //   );

      return (
        <pre style={{ fontFamily: "inherit" }} className="whitespace-pre-wrap">
          {display}
        </pre>
      );
    }
  };

  const showDetail = useMemo(() => {
    if (selectedIndex >= 0) {
      return renderDetail(histories[selectedIndex]);
    }
  }, [selectedIndex]);

  return (
    <div className="flex h-full divide-x divide-gray-200">
      <ul
        className={`w-2/5 overflow-hidden hover:overflow-y-auto scrollbar-thin scrollbar-gutter-stable scrollbar-track-transparent scrollbar-thumb-slate-400 scrollbar-thumb-round-full
          ${hidePointer ? "cursor-none" : ""}
          `}
        onScroll={handleUlScroll}
      >
        {histories.length > 0 &&
          histories.map((item, index) => (
            <li
              key={item.id}
              ref={(el) => {
                listRefs.current[index] = el;
              }}
              className={`h-10 my-1 mx-1 px-2 flex items-center rounded-lg ${
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
              onDoubleClick={() => {
                reCopy(item);
              }}
            >
              <span className="truncate">{generateSummary(item)}</span>
            </li>
          ))}
      </ul>
      <div className="w-3/5 divide-y divide-gray-200">
        <div className="h-1/2 overflow-hidden hover:overflow-auto py-2 px-2 scrollbar-thin scrollbar-gutter-stable scrollbar-track-transparent scrollbar-thumb-slate-400 scrollbar-thumb-round-full">
          {showDetail}
        </div>
        <div className="h-1/2">details</div>
      </div>
    </div>
  );
};

export default Content;
