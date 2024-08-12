import React, { useEffect } from "react";
import { Input } from "./ui/input";
import { Toggle } from "./ui/toggle";
import { Regex } from "lucide-react";
import { SearchBody } from "@/types/types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";

interface IProps {
  setSearchBody: (body: SearchBody) => void;
}

const Header = ({ setSearchBody }: IProps) => {
  const [keyword, setSerchKeyword] = React.useState<string>("");
  const [regex, setRegex] = React.useState<boolean>(false);
  const [type, setType] = React.useState<string>("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log("set search body", keyword, regex);
    setSearchBody({
      keyword,
      config: {
        regex,
        type,
      },
    });
  }, [keyword, regex, type]);

    // intialize component
    useEffect(() => {
      window.ipc.on("app:show", () => {inputRef.current?.focus()});
    }, []);

  return (
    <div className="fixed w-full flex items-center h-12 pr-2">
      <Input
        className="h-full focus-visible:ring-transparent focus-visible:ring-offset-transparent border-none"
        placeholder="Input to search..."
        ref={inputRef}
        onChange={(e) => setSerchKeyword(e.target.value)}
      />
      <div className="flex gap-1">
        <Toggle
          className={`
          ${
            keyword.length === 0
              ? "opacity-0 pointer-events-none cursor-default"
              : ""
          }
          ease-in-out duration-500 transition-opacity
        `}
          onPressedChange={setRegex}
        >
          <Regex />
        </Toggle>
        <Select
          value={type}
          onValueChange={(value) => {
            console.log("value", value);
            if (value === "all") {
              setType("");
            } else {
              setType(value);
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
