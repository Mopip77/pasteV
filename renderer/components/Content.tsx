"use client";
import {
  ClipboardHisotryEntity,
  ClipboardHistoryEntityDetail,
} from "@/../main/db/schemes";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Toggle } from "./ui/toggle";
import { HeadingIcon, LucideExternalLink, ScanTextIcon } from "lucide-react";
import { HIGHLIGHT_LANGUAGES } from "@/lib/consts";
import log from "electron-log/renderer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Button } from "./ui/button";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { SearchBodyContext } from "./ClipboardHistory";
import { debounce, throttle } from "@/lib/utils";

interface HighlightResult {
  error?: Error;
  highlightHtml?: string;
  language?: string;
}

const Content = () => {
  const { searchBody, setSearchBody } = useContext(SearchBodyContext);

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
  const [contentFC, setContentFC] = useState(null);
  const [showHighlight, setShowHighlight] = useState<boolean>(false);
  const [showOcrResult, setShowOcrResult] = useState<boolean>(false);
  const listRefs = useRef<(HTMLLIElement | null)[]>([]);

  const batchSize = 40;

  const fetchHistory = async ({
    keyword = "",
    offset = 0,
    size = batchSize,
    regex = false,
    type = "",
  } = {}) => {
    log.debug(
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

  const initComponent = throttle(async () => {
    handleSelectionChange(-1);
    setHistories([]);
    setMouseIndex(-1);
    setHidePointer(false);
    setNoMoreHistory(false);
    const results = await fetchHistory({
      keyword: searchBody.keyword,
      offset: 0,
      size: batchSize,
      regex: searchBody.regex,
      type: searchBody.type,
    });
    setHistories(results);
    if (results.length > 0) {
      handleSelectionChange(0);
    }
  }, 500);

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
        handleSelectionChange((prevIndex) =>
          Math.min(prevIndex + 1, histories.length - 1)
        );
        setHidePointer(true);
        setMouseIndex(-1);
      } else if (event.key === "ArrowUp") {
        handleSelectionChange((prevIndex) => {
          const listIsEmpty = histories.length === 0;
          return Math.max(prevIndex - 1, listIsEmpty ? -1 : 0);
        });
        setHidePointer(true);
        setMouseIndex(-1);
      } else if (event.key === "Enter") {
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

  const debouncedHighlightFunc = useCallback(
    debounce(async (item: ClipboardHisotryEntity) => {
      try {
        log.debug("start to hilight");
        const result = await asyncGenerateHighlightInfo(item);
        if (!highlightGereratorAbortController.current.signal.aborted) {
          setHighlightInfo(result);
        }
      } catch (error) {
        log.error("highlight error", error);
        if (!highlightGereratorAbortController.current.signal.aborted) {
          setHighlightInfo({ error });
        }
      }
    }, 100),
    []
  );

  // async generate content
  useEffect(() => {
    setContentFC(null);
    const content = showContent();
    setContentFC(content);
  }, [selectedIndex]);

  // async generate highlight info
  useEffect(() => {
    log.debug("async generate highlight info", selectedIndex);
    if (selectedIndex >= 0) {
      if (highlightGereratorAbortController.current) {
        highlightGereratorAbortController.current.abort();
      }
      highlightGereratorAbortController.current = new AbortController();
      log.debug("before hilight");
      debouncedHighlightFunc(histories[selectedIndex]);
    } else {
      setHighlightInfo(undefined);
      setShowHighlight(false);
    }
  }, [selectedIndex]);

  const handleSelectionChange = (index: React.SetStateAction<number>) => {
    setSelectedIndex(index);
    setShowHighlight(false);
    setShowOcrResult(false);
    setHighlightInfo(undefined);
  };

  const handleUlScroll = (event: React.UIEvent<HTMLUListElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (
      scrollTop + clientHeight >= scrollHeight - 10 &&
      !loadingHistory &&
      !noMoreHistory
    ) {
      log.debug("fetch more history");
      fetchHistory({
        keyword: searchBody.keyword,
        offset: histories.length,
        size: batchSize,
        regex: searchBody.regex,
        type: searchBody.type,
      }).then((moreHistories: ClipboardHisotryEntity[]) => {
        setHistories((prevHistories) => [...prevHistories, ...moreHistories]);
      });
    }
  };

  const reCopy = async (item: ClipboardHisotryEntity) => {
    window.ipc.send("app:hide", "");
    window.ipc.invoke("clipboard:add", item, true);
    setSearchBody((prev) => ({
      ...prev,
      keyword: "",
    }));
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
  
  const generateTags = (item: ClipboardHisotryEntity) => {
    return JSON.parse(item.details).tags?.map((tag, index) => (
      <span key={index} className="text-xs bg-gray-200 rounded-sm px-2 py-1 mx-1 w-10 overflow-x-hidden whitespace-nowrap">
        {tag}
      </span>
    ));
  };

  const renderContent = (item: ClipboardHisotryEntity) => {
    if (item?.type === "image" && item.blob) {
      const base64String = Buffer.from(item.blob).toString("base64");
      return (
        <TransformWrapper
          smooth={false}
          wheel={{ step: 0.1 }}
          doubleClick={{ mode: "toggle" }}
        >
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{ width: "100%", height: "100%" }}
          >
            <img
              className="w-full h-full object-contain object-left-top"
              src={`data:image/png;base64,${base64String}`}
              alt="Detail"
              loading="lazy"
            />
          </TransformComponent>
        </TransformWrapper>
      );
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
      return undefined;
    }

    const highlightResult = hljs.highlightAuto(item?.text, HIGHLIGHT_LANGUAGES);
    log.debug("highlightResult, ", highlightResult);
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
    const details = [
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

    const detailObj: ClipboardHistoryEntityDetail = JSON.parse(item.details);
    if (detailObj.byteLength) {
      let sizeLabel = `${(detailObj.byteLength / 1024).toFixed(2)} KB`;
      if (detailObj.byteLength >= 1024 * 1024) {
        sizeLabel = `${(detailObj.byteLength / (1024 * 1024)).toFixed(2)} MB`;
      }
      details.unshift({
        label: "文件大小",
        value: sizeLabel,
      });
    }

    if (detailObj.wordCount) {
      details.unshift({
        label: "单词数",
        value: detailObj.wordCount.toString(),
      });
    }

    return details;
  };

  const showContent = useCallback(() => {
    log.log("re render showContent", selectedIndex, showHighlight);
    if (selectedIndex >= 0) {
      if (showHighlight) {
        if (highlightInfo?.error) {
          return (
            <pre
              style={{ fontFamily: "inherit" }}
              className="whitespace-pre-wrap"
            >
              {highlightInfo.error.message}
            </pre>
          );
        }
        return (
          <pre
            style={{ fontFamily: "inherit" }}
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: highlightInfo.highlightHtml }}
          ></pre>
        );
      } else if (showOcrResult) {
        return (
          <pre
            style={{ fontFamily: "inherit" }}
            className="whitespace-pre-wrap"
          >
            {histories[selectedIndex].text}
          </pre>
        );
      }
      return renderContent(histories[selectedIndex]);
    }
  }, [selectedIndex, showHighlight, showOcrResult]);

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
    console.debug("re render help buttons", selectedIndex, highlightInfo);
    if (selectedIndex < 0) {
      return;
    }

    if (histories[selectedIndex].type === "image") {
      if (histories[selectedIndex].text) {
        return (
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger>
                <Toggle className="" onPressedChange={setShowOcrResult}>
                  <ScanTextIcon className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                <p>展示ocr结果</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
    }

    if (histories[selectedIndex].type === "text") {
      if (highlightInfo && !highlightInfo.error && highlightInfo.language) {
        const displaies = [
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger>
                <Toggle className="" onPressedChange={setShowHighlight}>
                  <HeadingIcon className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  高亮格式化
                  <span className="font-bold italic">
                    {highlightInfo.language}
                  </span>
                  内容
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>,
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
              key={index}
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
              <div className="flex-grow truncate">{generateSummary(item)}</div>
              <div className="flex items-center">{generateTags(item)}</div>
            </li>
          ))}
      </ul>
      <div className="w-3/5 divide-y divide-gray-200">
        <div className="w-full h-2/3">
          <div className="h-full w-full overflow-x-auto break-words overflow-y-hidden hover:overflow-y-auto py-2 px-2 scrollbar-thin scrollbar-gutter-stable scrollbar-track-transparent scrollbar-thumb-slate-400 scrollbar-thumb-round-full bg-transparent">
            {contentFC ? contentFC : 'Loading...'}
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
