"use client";
import { ClipboardHisotryEntity } from "@/../main/db/schemes";
import { SearchBody } from "@/types/types";
import "highlight.js/styles/default.css";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface IProps {
  searchBody: SearchBody;
}

const Content = ({ searchBody }: IProps) => {
  const [histories, setHistories] = useState<ClipboardHisotryEntity[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [mouseUpIndex, setMouseIndex] = useState<number>(-1);
  const [hidePointer, setHidePointer] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [noMoreHistory, setNoMoreHistory] = useState<boolean>(false);
  const listRefs = useRef<(HTMLLIElement | null)[]>([]);

  const batchSize = 40;

  const fetchHistory = async ({
    keyword = "",
    offset = 0,
    size = batchSize,
    regex = false,
  } = {}) => {
    console.debug(
      "fetchHistory, keyword=",
      keyword,
      "offset=",
      offset,
      "size=",
      size,
      "regex=",
      regex
    );
    setLoadingHistory(true);
    const result = await global.window.ipc.invoke("clipboard:query", {
      keyword,
      regex,
      offset,
      size,
    });

    if (result.length !== size) {
      setNoMoreHistory(true);
    }

    setLoadingHistory(false);
    return result;
  };

  const initComponent = async () => {
    setSelectedIndex(-1);
    setHistories([]);
    setMouseIndex(-1);
    setHidePointer(false);
    setNoMoreHistory(false);
    fetchHistory({
      keyword: searchBody.keyword,
      offset: 0,
      size: batchSize,
      regex: searchBody.config?.regex,
    }).then((result: ClipboardHisotryEntity[]) => {
      setHistories(result);
    });
  };

  // intialize component
  useEffect(() => {
    window.ipc.on("app:show", () => initComponent());
    initComponent();
  }, []);

  // search body changed
  useEffect(() => {
    initComponent();
  }, [searchBody]);

  // keyboard event
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

  // scroll to selected index
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
        keyword: searchBody.keyword,
        offset: histories.length,
        size: batchSize,
        regex: searchBody.config?.regex,
      }).then((moreHistories: ClipboardHisotryEntity[]) => {
        setHistories((prevHistories) => [...prevHistories, ...moreHistories]);
      });
    }
  };

  const reCopy = async (item: ClipboardHisotryEntity) => {
    window.ipc.invoke("clipboard:add", item);
    window.ipc.send("app:hide", "");
  };

  const generateSummary = (item: ClipboardHisotryEntity): string => {
    if (item.type === "image") {
      let summary = "Image";
      const detailJson = JSON.parse(item.details);
      if (detailJson.width && detailJson.height) {
        summary += ` (${detailJson.width}x${detailJson.height})`;
      } else {
        summary += "...";
      }
      return summary;
    }
    return item.text;
  };

  const renderContent = (item: ClipboardHisotryEntity) => {
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

  const generateDetails = (
    item: ClipboardHisotryEntity
  ): { label: string; value: string }[] => {
    return [
      {
      label: '类型',
      value: item.type,
      },
      {
      label: "上次使用时间",
      value: new Date(item.lastReadTime).toLocaleString(),
      },
      {
      label: "创建时间",
      value: new Date(item.createTime).toLocaleString(),
      },
    ];
  };

  const showContent = useMemo(() => {
    if (selectedIndex >= 0) {
      return renderContent(histories[selectedIndex]);
    }
  }, [selectedIndex]);

  const showDetails = useMemo(() => {
    if (selectedIndex >= 0) {
      return (
        <ul className="flex flex-col divide-y divide-gray-300">
          {generateDetails(histories[selectedIndex]).map((item, index) => (
            <li
              key={index}
              className="w-full text-sm text-gray-500 flex justify-between px-2 py-1"
            >
              <span className="font-bold">{item.label}</span>
              <span>{item.value}</span>
            </li>
          ))}
        </ul>
      );
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
          {showContent}
        </div>
        <div className="h-1/2 flex flex-col-reverse">{showDetails}</div>
      </div>
    </div>
  );
};

export default Content;
