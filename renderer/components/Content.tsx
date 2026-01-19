"use client";
import {
  ClipboardHistoryMeta,
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
import {
  Download,
  HeadingIcon,
  Image,
  LetterText,
  LucideExternalLink,
  ScanTextIcon,
} from "lucide-react";
import { HIGHLIGHT_LANGUAGES } from "@/lib/consts";
import log from "electron-log/renderer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { SearchBodyContext, StatsContext } from "./ClipboardHistory";
import { debounce, throttle } from "@/lib/utils";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";
import { SearchBody } from "@/types/types";
import { useSelector } from "react-redux";
import { RootState } from "@/stores/store";

interface HighlightResult {
  error?: Error;
  highlightHtml?: string;
  language?: string;
}

const Content = () => {
  const { searchBody, setSearchBody } = useContext(SearchBodyContext);
  const { setCurrentItems, setSelectedIndex: setStatsSelectedIndex } = useContext(StatsContext);
  const appConfig = useSelector((state: RootState) => state.appSettingConfig);

  const [histories, setHistories] = useState<ClipboardHistoryMeta[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [mouseUpIndex, setMouseIndex] = useState<number>(-1);
  const [hidePointer, setHidePointer] = useState<boolean>(false);
  const [noMoreHistory, setNoMoreHistory] = useState<boolean>(false);
  const [isSemanticSearching, setIsSemanticSearching] = useState<boolean>(false);
  const [highlightInfo, setHighlightInfo] =
    useState<HighlightResult>(undefined);
  const highlightGereratorAbortController = useRef<AbortController | null>(
    null
  );
  const [showQuickSelect, setShowQuickSelect] = useState<boolean>(false);
  const [contentFC, setContentFC] = useState(null);
  const [showHighlight, setShowHighlight] = useState<boolean>(false);
  const [showOcrResult, setShowOcrResult] = useState<boolean>(false);
  const listRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [detailsFC, setDetailsFC] = useState(null);
  // 当前选中图片的 blob（懒加载）
  const [currentBlob, setCurrentBlob] = useState<Buffer | null>(null);

  const batchSize = 40;

  const fetchHistory = async ({
    keyword = "",
    cursor = "",
    size = batchSize,
    regex = false,
    type = "",
    semantic = false,
  } = {}) => {
    log.debug("fetchHistory", { keyword, cursor, size, regex, type, semantic });

    // If semantic search, call different IPC
    if (semantic) {
      setIsSemanticSearching(true);
      try {
        const threshold = appConfig.semanticSearchThreshold || 0.76;
        const result = await global.window.ipc.invoke(
          "clipboard:semanticSearch",
          keyword,
          threshold,
          size
        );
        setNoMoreHistory(true); // Semantic search doesn't support pagination
        return result;
      } finally {
        setIsSemanticSearching(false);
      }
    }

    // Normal keyword search
    const result = await global.window.ipc.invoke("clipboard:query", {
      keyword,
      regex,
      type,
      cursor,
      size,
    });

    if (result.length !== size) {
      setNoMoreHistory(true);
    }

    return result;
  };

  useEffect(() => {
    window.ipc.on("app:show", () => {
      initComponent();
    });
  });

  const initComponent = throttle(async () => {
    handleSelectionChange(-1);
    setHistories([]);
    setMouseIndex(-1);
    setHidePointer(false);
    setNoMoreHistory(false);
    setCurrentBlob(null);
    const results = await fetchHistory({
      keyword: searchBody.keyword,
      cursor: "",
      size: batchSize,
      regex: searchBody.regex,
      type: searchBody.type,
      semantic: searchBody.semantic,
    });
    setHistories(results);
    if (results.length > 0) {
      handleSelectionChange(0);
    }
  }, 500);

  // intialize component
  useEffect(() => {
    initComponent();
  }, []);

  // search body changed
  useEffect(() => {
    initComponent();
  }, [searchBody]);

  // Update stats when histories change
  useEffect(() => {
    setCurrentItems(histories.length);
  }, [histories.length, setCurrentItems]);

  // Update stats when selectedIndex changes
  useEffect(() => {
    setStatsSelectedIndex(selectedIndex);
  }, [selectedIndex, setStatsSelectedIndex]);

  // navigation keyboard event
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) => Math.min(prev + 1, histories.length - 1));
        setHidePointer(true);
        setMouseIndex(-1);
      } else if (event.key === "ArrowUp") {
        setSelectedIndex((prev) => {
          const listIsEmpty = histories.length === 0;
          return Math.max(prev - 1, listIsEmpty ? -1 : 0);
        });
        setHidePointer(true);
        setMouseIndex(-1);
      } else if (event.key === "Enter") {
        const selectedItem = histories[selectedIndex];
        if (selectedItem) {
          reCopy(selectedItem);
        }
      }
    },
    [histories.length, selectedIndex]
  );

  const handleMouseMove = useCallback(() => {
    setHidePointer(false);
  }, []);

  // 事件监听只需要设置一次
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleKeyDown, handleMouseMove]);

  // quick select keyboard event
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Meta" || event.key === "Control") {
        setShowQuickSelect(true);
        return;
      }

      if (
        ["1", "2", "3", "4", "5"].includes(event.key) &&
        (event.metaKey || event.ctrlKey)
      ) {
        reCopy(histories[parseInt(event.key) - 1]);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Meta" || event.key === "Control") {
        setShowQuickSelect(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  });

  // scroll to selected index
  useEffect(() => {
    if (selectedIndex >= 0) {
      listRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  const debouncedHighlightFunc = useCallback(
    debounce(async (item: ClipboardHistoryMeta, abortController: AbortController) => {
      try {
        setHighlightInfo(undefined);
        const result = await asyncGenerateHighlightInfo(item);
        if (!abortController.signal.aborted) {
          setHighlightInfo(result);
        }
      } catch (error) {
        log.error("highlight error", error);
        if (!abortController.signal.aborted) {
          setHighlightInfo({ error });
        }
      }
    }, 100),
    []
  );

  const showContent = (
    histories: ClipboardHistoryMeta[],
    selectedIndex: number,
    showHighlight: boolean,
    showOcrResult: boolean,
    highlightInfo: HighlightResult | undefined,
    searchBody: SearchBody,
    imageBlob: Buffer | null
  ) => {
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
      return renderContent(histories[selectedIndex], searchBody, imageBlob);
    }
  };

  // 1. 创建一个 debounced 函数
  const debouncedSetContentFC = useCallback(
    debounce((
      histories: ClipboardHistoryMeta[],
      selectedIndex: number,
      showHighlight: boolean,
      showOcrResult: boolean,
      highlightInfo: HighlightResult | undefined,
      searchBody: SearchBody,
      imageBlob: Buffer | null
    ) => {
      setContentFC(null);
      const content = showContent(histories, selectedIndex, showHighlight, showOcrResult, highlightInfo, searchBody, imageBlob);
      setContentFC(content);
    }, 100),
    [] // 空依赖数组，确保 debounced 函数只创建一次
  );

  // 2. 在 useEffect 中调用这个 debounced 函数
  useEffect(() => {
    debouncedSetContentFC(histories, selectedIndex, showHighlight, showOcrResult, highlightInfo, searchBody, currentBlob);
  }, [
    histories,
    selectedIndex,
    showHighlight,
    showOcrResult,
    highlightInfo,
    searchBody,
    currentBlob,
    debouncedSetContentFC,
  ]);

  // async generate highlight info
  useEffect(() => {
    log.debug("async generate highlight info", selectedIndex);
    if (selectedIndex >= 0) {
      if (highlightGereratorAbortController.current) {
        highlightGereratorAbortController.current.abort();
      }
      highlightGereratorAbortController.current = new AbortController();
      debouncedHighlightFunc(
        histories[selectedIndex], 
        highlightGereratorAbortController.current
      );
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
    setCurrentBlob(null);  // 清除旧的 blob
  };

  // 懒加载图片 blob
  useEffect(() => {
    const loadBlob = async () => {
      if (selectedIndex >= 0 && histories[selectedIndex]?.type === "image") {
        const blob = await window.ipc.invoke("clipboard:getBlob", histories[selectedIndex].hashKey);
        setCurrentBlob(blob);
      }
    };
    loadBlob();
  }, [selectedIndex, histories]);

  const loadMoreItems = async (startIndex: number, stopIndex: number) => {
    log.debug(
      "loadMoreItems, startIndex=",
      startIndex,
      "stopIndex=",
      stopIndex
    );
    if (stopIndex >= histories.length - 1) {
      // 使用游标分页：取最后一条的 lastReadTime 作为游标
      const lastItem = histories[histories.length - 1];
      const cursor = lastItem?.lastReadTime || "";
      const moreHistories = await fetchHistory({
        keyword: searchBody.keyword,
        cursor,
        size: batchSize,
        regex: searchBody.regex,
        type: searchBody.type,
      });
      setHistories(prev => [...prev, ...moreHistories]);
    }
  };

  const reCopy = async (item: ClipboardHistoryMeta) => {
    window.ipc.send("app:hide", "");
    window.ipc.invoke("clipboard:add", item.hashKey, true);
    setSearchBody((prev) => ({
      ...prev,
      keyword: "",
    }));
  };

  const generateSummary = (item: ClipboardHistoryMeta) => {
    let icon;
    let summary = "";
    if (item.type === "image") {
      summary = "Image";
      const detailJson = JSON.parse(item.details);
      if (detailJson.width && detailJson.height) {
        summary += ` (${detailJson.width}x${detailJson.height})`;
      } else {
        summary += "...";
      }
      icon = <Image />;
      // const base64String = Buffer.from(new Uint8Array(item.blob)).toString(
      //   "base64"
      // );
      // icon = (
      //   <img
      //     loading="lazy"
      //     src={`data:image/png;base64,${base64String}`}
      //     className="w-6 h-6 object-cover rounded"
      //     alt="thumbnail"
      //   />
      // );
    } else {
      summary = item.text;
      icon = <LetterText />;
    }

    return (
      <>
        <div className="w-6 h-6 ml-1 mr-2 font-extrabold">{icon}</div>
        <div className="flex-grow truncate text-sm text-gray-900">
          {summary}
        </div>
      </>
    );
  };

  const generateTags = (item: ClipboardHistoryMeta) => {
    return JSON.parse(item.details).tags?.map((tag, index) => (
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <span
              key={index}
              className="text-xs bg-gray-200 rounded-sm px-2 py-1 mx-1 w-10 overflow-x-hidden whitespace-nowrap"
            >
              {tag.substring(0, 2)}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tag}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ));
  };

  const renderContent = (
    item: ClipboardHistoryMeta,
    searchBody: SearchBody,
    imageBlob: Buffer | null
  ) => {
    if (!item) {
      return <></>;
    }

    if (item.type === "image") {
      if (!imageBlob) {
        return <div className="flex items-center justify-center h-full text-gray-500">Loading image...</div>;
      }
      const base64String = Buffer.from(new Uint8Array(imageBlob)).toString(
        "base64"
      );
      return (
        <TransformWrapper
          smooth={false}
          wheel={{ step: 0.1, wheelDisabled: true }}
          panning={{ wheelPanning: true }}
          doubleClick={{ mode: "reset" }}
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
      const highlightedContent = highlightSearchTextOnContent(
        item.text,
        searchBody.keyword,
        searchBody.regex
      );
      return (
        <pre
          style={{ fontFamily: "inherit" }}
          className="whitespace-pre-wrap z-10"
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
        />
      );
    }
  };

  const asyncGenerateHighlightInfo = async (
    item: ClipboardHistoryMeta
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
    item: ClipboardHistoryMeta
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

  const highlightSearchTextOnContent = (
    content: string,
    searchKey: string,
    regex: boolean
  ): string => {
    function escapeHtml(content: string) {
      return content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    const escapedHtml = escapeHtml(content);
    if (!searchKey) {
      return escapedHtml;
    }

    const pattern = regex
      ? new RegExp(searchKey, "gi")
      : new RegExp(searchKey.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "gi");
    return escapedHtml.replace(
      pattern,
      `<span style="background-color: powderblue;">$&</span>`
    );
  };

  const handleSaveImage = () => {
    if (!currentBlob) {
      log.warn("No blob available to save");
      return;
    }
    const blob = new Blob([currentBlob], { type: "image/png" });
    const url = URL.createObjectURL(blob);

    const details: ClipboardHistoryEntityDetail = JSON.parse(
      histories[selectedIndex].details
    );
    const firstTag = details.tags?.[0] || "image";

    const link = document.createElement("a");
    link.href = url;
    link.download = `${firstTag}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const showContentHelpButtons = useMemo(() => {
    console.debug("re render help buttons", selectedIndex, highlightInfo);
    if (selectedIndex < 0 || !histories[selectedIndex]) {
      return;
    }

    if (histories[selectedIndex].type === "image") {
      if (histories[selectedIndex].text) {
        return (
          <>
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
            <TooltipProvider>
              <Tooltip delayDuration={100}>
                <TooltipTrigger>
                  <Toggle className="" onPressedChange={handleSaveImage}>
                    <Download className="h-4 w-4" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>
                  <p>保存图片到本地</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
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
                  <Toggle
                    variant="outline"
                    onPressedChange={() => {
                      reCopy(histories[selectedIndex]);
                      window.ipc.send("system:openUrl", "https://jsont.run/");
                    }}
                  >
                    <LucideExternalLink className="h-4 w-4" />
                  </Toggle>
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

  const debouncedSetDetailsFC = useCallback(
    debounce((clipBoardItem: ClipboardHistoryMeta) => {
      setDetailsFC(null);
      if (clipBoardItem) {
        setDetailsFC(
          <ul className="flex flex-col divide-y divide-gray-300">
            {generateDetails(clipBoardItem).map((item, index) => (
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
    }, 100),
    []
  );

  useEffect(() => {
    debouncedSetDetailsFC(histories[selectedIndex]);
  }, [histories, selectedIndex, debouncedSetDetailsFC]);

  return (
    <>
      <div className="flex h-full divide-x divide-gray-200">
        <div className="w-2/5">
          {/* Semantic search loading indicator */}
          {isSemanticSearching && histories.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-sm">正在进行语义搜索...</p>
              <p className="text-xs text-gray-400 mt-1">AI 正在理解您的查询</p>
            </div>
          )}

          {/* Normal list view */}
          {!isSemanticSearching || histories.length > 0 ? (
            <AutoSizer>
              {({ width, height }) => (
                <InfiniteLoader
                  isItemLoaded={(index) =>
                    noMoreHistory || index < histories.length - 1
                  }
                  itemCount={histories.length}
                  loadMoreItems={loadMoreItems}
                >
                  {({ onItemsRendered, ref }) => (
                    <FixedSizeList
                      width={width}
                      height={height}
                      itemSize={40}
                      itemCount={histories.length}
                      onItemsRendered={onItemsRendered}
                      ref={ref}
                      className="scrollbar-none"
                    >
                      {({ index, style }) => (
                        <li
                          key={index}
                          ref={(el) => {
                            listRefs.current[index] = el;
                          }}
                          className={`flex items-center px-2 rounded-lg ${
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
                            reCopy(histories[index]);
                          }}
                          style={style}
                        >
                          <div className="w-full flex items-center">
                            {index < 5 && showQuickSelect && (
                              <div className="absolute w-10 left-0 flex items-center justify-center py-2.5 pl-3 pr-5 text-white bg-[#3f4756ee] rounded-r-full text-sm animate-in slide-in-from-left duration-100">
                                {`⌘+${index + 1}`}
                              </div>
                            )}
                            {generateSummary(histories[index])}
                          </div>
                        <div className="flex items-center">
                          {generateTags(histories[index])}
                        </div>
                      </li>
                    )}
                  </FixedSizeList>
                )}
              </InfiniteLoader>
            )}
          </AutoSizer>
          ) : null}
        </div>
        <div className="w-3/5 divide-y divide-gray-200">
          <div className="w-full h-2/3 relative">
            <div className="h-full w-full overflow-x-auto break-words overflow-y-hidden hover:overflow-y-auto py-2 px-2 scrollbar-thin scrollbar-gutter-stable scrollbar-track-transparent scrollbar-thumb-slate-400 scrollbar-thumb-round-full bg-transparent">
              {contentFC ? contentFC : histories.length > 0 ? "Loading..." : ""}
            </div>
            <div className="relative bottom-12">
              <div className="flex flex-row-reverse bg-transparent z-20 justify-start items-center py-1 pr-1 gap-2">
                {showContentHelpButtons}
              </div>
            </div>
          </div>
          <div className="h-1/3 flex flex-col-reverse">
            {detailsFC ? detailsFC : histories.length > 0 ? "Loading..." : ""}
          </div>
        </div>
      </div>
      <div className="fixed inset-0 pointer-events-none">
        <div className="relative w-full h-full">
          <div
            id="dropdown-portal"
            className="absolute top-0 left-0 right-0 pointer-events-auto"
          />
        </div>
      </div>
    </>
  );
};

export default Content;
