import React, { useContext, useEffect } from "react";
import { Input } from "./ui/input";
import { Toggle } from "./ui/toggle";
import { Regex } from "lucide-react";
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

const Header = () => {
  const { searchBody, setSearchBody } = useContext(SearchBodyContext);

  const inputRef = React.useRef<HTMLInputElement>(null);

  // intialize component
  useEffect(() => {
    window.ipc.on("app:show", () => {
      inputRef.current?.focus();
    });
  }, []);

  // 如果用户按键但不包含 modifers 则聚焦到搜索框
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果当前焦点在输入框内则不处理
      if (e.target === inputRef.current) {
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

  return (
    <div className="fixed w-full flex items-center h-12 pr-2">
      <Input
        className="h-full focus-visible:ring-transparent focus-visible:ring-offset-transparent border-none"
        placeholder="Input to search..."
        ref={inputRef}
        value={searchBody.keyword}
        onChange={(e) =>
          setSearchBody((prev) => ({
            ...prev,
            keyword: e.target.value,
          }))
        }
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
      <div className="flex gap-1">
        <Toggle
          className={`
          ${
            searchBody.keyword.length === 0
              ? "opacity-0 pointer-events-none cursor-default"
              : ""
          }
          ease-in-out duration-500 transition-opacity
        `}
          onPressedChange={(pressed) => {
            setSearchBody((prev) => ({
              ...prev,
              regex: pressed,
            }));
          }}
        >
          <Regex />
        </Toggle>
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
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default Header;
