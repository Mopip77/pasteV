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

interface IProps {
  setSearchBody: (body: SearchBody) => void;
}

const Header = ({ setSearchBody }: IProps) => {
  const [keyword, setSerchKeyword] = React.useState<string>("");
  const [regex, setRegex] = React.useState<boolean>(false);
  const [type, setType] = React.useState<string>("");

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

  return (
    <div className="fixed w-full flex items-center h-12">
      <Input
        className="h-full focus-visible:ring-transparent focus-visible:ring-offset-transparent border-none"
        placeholder="Input to search..."
        onChange={(e) => setSerchKeyword(e.target.value)}
      />
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
      <Select onValueChange={setType}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by type" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="text">文本</SelectItem>
            <SelectItem value="image">图片</SelectItem>
            <SelectItem value="file">文件</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default Header;
