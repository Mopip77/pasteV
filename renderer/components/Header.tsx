import React, { useContext, useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Toggle } from "./ui/toggle";
import { Brain, Regex } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import { SearchBodyContext } from "./ClipboardHistory";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { MultiSelect } from "./ui/multi-select";
import { useSelector } from "react-redux";
import { RootState } from "@/stores/store";

const Header = () => {
  const { searchBody, setSearchBody } = useContext(SearchBodyContext);
  const [inputValue, setInputValue] = useState(searchBody.keyword);
  let compositionStart = useRef(false);
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const multiSelectRef = useRef<HTMLDivElement>(null);
  const appConfig = useSelector((state: RootState) => state.appSettingConfig);

  // 记住语义搜索前的类型，用于切换回普通模式时恢复
  const previousTypeRef = useRef<string>("");

  // 类型循环顺序
  const typeOrder = ["text", "image", "file", "all"];

  const inputRef = useHotkeys<HTMLInputElement>(
    "mod+i",
    () => {
      setSearchBody((prev) => ({
        ...prev,
        regex: !prev.regex,
      }));
    },
    { enableOnFormTags: true }
  );

  // 添加 cmd+p 循环切换类型
  useHotkeys(
    "mod+p",
    () => {
      const currentType = searchBody.type === "" ? "all" : searchBody.type;
      const currentIndex = typeOrder.indexOf(currentType);
      const nextIndex = (currentIndex + 1) % typeOrder.length;
      const nextType = typeOrder[nextIndex];

      if (nextType === "all") {
        setSearchBody((prev) => ({
          ...prev,
          type: "",
        }));
      } else {
        setSearchBody((prev) => ({
          ...prev,
          type: nextType,
        }));
      }
    },
    { enableOnFormTags: true }
  );

  function _onChange(event) {
    setInputValue(event.target.value);

    if (event.type === "compositionstart") {
      compositionStart.current = true;
      return;
    }

    if (event.type === "compositionend") {
      compositionStart.current = false;
    }

    if (!compositionStart.current) {
      setSearchBody((prev) => ({
        ...prev,
        keyword: event.target.value,
      }));
    }
  }

  // intialize component
  useEffect(() => {
    window.ipc.on("app:show", () => {
      inputRef.current?.focus();
    });
  }, []);

  // 修改键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查当前焦点元素是否是任何输入框
      const isInputFocused = document.activeElement?.tagName === "INPUT";

      if (isInputFocused) {
        return;
      }

      if (
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.shiftKey
      ) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const fetchTags = async (filter: string = "") => {
    const tags = await window.ipc.invoke("tags:query", filter);
    setTagOptions(tags);
  };

  useEffect(() => {
    fetchTags();
  }, []);

  return (
    <div className="fixed w-full flex items-center h-12 pr-2">
      <Input
        className="h-full focus-visible:ring-transparent focus-visible:ring-offset-transparent border-none"
        placeholder="Input to search..."
        ref={inputRef}
        value={inputValue}
        onCompositionUpdate={_onChange}
        onCompositionStart={_onChange}
        onCompositionEnd={_onChange}
        onChange={_onChange}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
          }
          if (e.key === "Escape") {
            if (searchBody.keyword.length > 0) {
              setSearchBody((prev) => ({
                ...prev,
                keyword: "",
              }));
              e.stopPropagation();
            }
          }
        }}
      />
      <div className="flex gap-1 items-start">
        {/* 语义搜索按钮 */}
        {appConfig.semanticSearchEnable && (
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger
                className={`${
                  searchBody.keyword.length === 0
                    ? "pointer-events-none cursor-default"
                    : ""
                }`}
              >
                <Toggle
                  className={`${
                    searchBody.keyword.length === 0 ? "opacity-0" : ""
                  } ease-in-out duration-500 transition-opacity`}
                  pressed={searchBody.semantic}
                  onPressedChange={(pressed) => {
                    if (pressed) {
                      // 切换到语义搜索：保存当前type，设置为image
                      previousTypeRef.current = searchBody.type;
                      setSearchBody((prev) => ({
                        ...prev,
                        semantic: true,
                        type: "image",
                      }));
                    } else {
                      // 切换回普通模式：恢复之前的type
                      setSearchBody((prev) => ({
                        ...prev,
                        semantic: false,
                        type: previousTypeRef.current,
                      }));
                    }
                  }}
                >
                  <Brain />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                <p className="py-1.5">
                  <span>语义搜索（仅图片）</span>
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {/* 正则搜索按钮 */}
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger
              className={`${
                searchBody.keyword.length === 0
                  ? "pointer-events-none cursor-default"
                  : ""
              }`}
            >
              <Toggle
                className={`${
                  searchBody.keyword.length === 0 ? "opacity-0" : ""
                } ease-in-out duration-500 transition-opacity`}
                pressed={searchBody.regex}
                onPressedChange={(pressed) => {
                  setSearchBody((prev) => ({
                    ...prev,
                    regex: pressed,
                  }));
                }}
              >
                <Regex />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              <p className="py-1.5">
                <span>使用正则匹配</span>
                <span className="bg-gray-300 bg-opacity-50 rounded-sm ml-2 pl-2 pr-3 py-1.5">
                  ⌘ + i
                </span>
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="relative">
          <MultiSelect
            className="min-w-[20px] max-w-[600px]"
            ref={multiSelectRef}
            value={searchBody.tags}
            onChange={(tags) => {
              setSearchBody((prev) => ({
                ...prev,
                tags,
              }));
            }}
            onInputChange={fetchTags}
            options={tagOptions}
            placeholder="tags..."
          />
        </div>
        <Select
          value={searchBody.type}
          onValueChange={(value) => {
            console.log("value", value);
            if (value === "all") {
              setSearchBody((prev) => ({
                ...prev,
                type: "",
              }));
            } else {
              setSearchBody((prev) => ({
                ...prev,
                type: value,
              }));
            }
          }}
        >
          <SelectTrigger className="w-[180px] focus-visible:ring-transparent focus:ring-transparent">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem key="text" value="text">
                文本
              </SelectItem>
              <SelectItem key="image" value="image">
                图片
              </SelectItem>
              <SelectItem key="file" value="file">
                文件
              </SelectItem>
            </SelectGroup>
            <Separator />
            <SelectGroup>
              <SelectItem key="all" value="all">
                ALL
              </SelectItem>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-muted-foreground px-2 py-1.5">
                      循环切换类型: ⌘ + p
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>使用快捷键循环切换类型</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default Header;
