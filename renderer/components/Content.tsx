"use client";
import { ClipboardHisotryEntity } from "@/../main/db/schemes";
import { SearchBody } from "@/types/types";
import hljs from "highlight.js";
import "highlight.js/styles/default.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Toggle } from "./ui/toggle";
import { HeadingIcon, LucideExternalLink } from "lucide-react";
import { HIGHLIGHT_LANGUAGES } from "@/lib/consts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Button } from "./ui/button";

interface IProps {
  searchBody: SearchBody;
}

interface HighlightResult {
  error?: Error;
  highlightHtml?: string;
  language?: string;
}

const Content = ({ searchBody }: IProps) => {
  const [histories, setHistories] = useState<ClipboardHisotryEntity[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [mouseUpIndex, setMouseIndex] = useState<number>(-1);
  const [hidePointer, setHidePointer] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [noMoreHistory, setNoMoreHistory] = useState<boolean>(false);
  const [highlightInfo, setHighlightInfo] =
    useState<HighlightResult>(undefined);
  const highlightGereratorAbortController = useRef<AbortController | null>(
    null
  );
  const [showHighlight, setShowHighlight] = useState<boolean>(false);
  const listRefs = useRef<(HTMLLIElement | null)[]>([]);

  const batchSize = 40;

  const fetchHistory = async ({
    keyword = "",
    offset = 0,
    size = batchSize,
    regex = false,
    type = "",
  } = {}) => {
    console.debug(
      "fetchHistory, keyword=",
      keyword,
      "offset=",
      offset,
      "size=",
      size,
      "regex=",
      regex,
      "type=",
      type
    );
    setLoadingHistory(true);
    const result = await global.window.ipc.invoke("clipboard:query", {
      keyword,
      regex,
      type,
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
    handleSelectionChange(-1);
    setHistories([]);
    setMouseIndex(-1);
    setHidePointer(false);
    setNoMoreHistory(false);
    fetchHistory({
      keyword: searchBody.keyword,
      offset: 0,
      size: batchSize,
      regex: searchBody.config?.regex,
      type: searchBody.config?.type,
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
        handleSelectionChange((prevIndex) => Math.min(prevIndex + 1, histories.length - 1));
        setHidePointer(true);
        setMouseIndex(-1);
      } else if (event.key === "ArrowUp") {
        handleSelectionChange((prevIndex) => Math.max(prevIndex - 1, 0));
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

  // async generate highlight info
  useEffect(() => {
    console.debug("async generate highlight info", selectedIndex);
    if (selectedIndex >= 0) {
      if (highlightGereratorAbortController.current) {
        highlightGereratorAbortController.current.abort();
      }
      highlightGereratorAbortController.current = new AbortController();
      asyncGenerateHighlightInfo(histories[selectedIndex])
        .then((result) => {
          if (!highlightGereratorAbortController.current.signal.aborted) {
            setHighlightInfo(result);
          }
        })
        .catch((error) => {
          console.error("highlight error", error);
          if (!highlightGereratorAbortController.current.signal.aborted) {
            setHighlightInfo({ error });
          }
        });
    } else {
      setHighlightInfo(undefined);
      setShowHighlight(false);
    }
  }, [selectedIndex]);

  const handleSelectionChange = (index: React.SetStateAction<number>) => {
    setSelectedIndex(index);
    setShowHighlight(false);
    setHighlightInfo(undefined);
  };

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
      return (
        <pre
          style={{ fontFamily: "inherit" }}
          className="whitespace-pre-wrap z-10"
        >
          {item.text}
        </pre>
      );
    }
  };

  const asyncGenerateHighlightInfo = async (
    item: ClipboardHisotryEntity
  ): Promise<HighlightResult> => {
    if (item.type !== "text") {
      return;
    }

    const highlightResult = hljs.highlightAuto(item?.text, HIGHLIGHT_LANGUAGES);
    console.debug("highlightResult, ", highlightResult);
    if (highlightResult.errorRaised) {
      return {
        error: highlightResult.errorRaised,
      };
    }

    return {
      highlightHtml: highlightResult.value,
      language: highlightResult.language,
    };
  };

  const generateDetails = (
    item: ClipboardHisotryEntity
  ): { label: string; value: string }[] => {
    return [
      {
        label: "类型",
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
    console.log("re render showContent", selectedIndex, showHighlight);
    if (selectedIndex >= 0) {
      if (showHighlight) {
        if (highlightInfo?.error) {
          return <pre>{highlightInfo.error.message}</pre>;
        }
        return (
          <pre
            style={{ fontFamily: "inherit" }}
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: highlightInfo.highlightHtml }}
          ></pre>
        );
      }
      return renderContent(histories[selectedIndex]);
    }
  }, [selectedIndex, showHighlight]);

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

  const showContentHelpButtons = useMemo(() => {
    if (highlightInfo && !highlightInfo.error && highlightInfo.language) {
      const displaies = [
        <Toggle className="" onPressedChange={setShowHighlight}>
          <HeadingIcon className="h-4 w-4" />
        </Toggle>,
      ];
      if (highlightInfo.language === "json") {
        const jsonEditorBtn = (
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={() => {
                    reCopy(histories[selectedIndex]);
                    window.ipc.send("system:openUrl", "https://jsont.run/");
                  }}
                >
                  <LucideExternalLink className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>复制并打开json编辑器</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
        displaies.push(jsonEditorBtn);
      }
      return displaies;
    }
  }, [selectedIndex, highlightInfo]);

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
                handleSelectionChange(index);
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
        <div className="w-full h-2/3">
          <div className="h-full w-full overflow-x-auto break-words overflow-y-hidden hover:overflow-y-auto py-2 px-2 scrollbar-thin scrollbar-gutter-stable scrollbar-track-transparent scrollbar-thumb-slate-400 scrollbar-thumb-round-full bg-transparent">
            {showContent}
          </div>
          <div className="relative bottom-12">
            <div className="flex flex-row-reverse bg-transparent z-20 justify-start items-center py-1 pr-1 gap-2">
              {showContentHelpButtons}
            </div>
          </div>
        </div>
        <div className="h-1/3 flex flex-col-reverse">{showDetails}</div>
      </div>
    </div>
  );
};

export default Content;
