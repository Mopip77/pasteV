import React, { useEffect } from "react";
import { Input } from "./ui/input";
import { Toggle } from "./ui/toggle";
import { Regex } from "lucide-react";
import { SearchBody } from "@/types/types";

interface IProps {
  setSearchBody: (body: SearchBody) => void;
}

const Header = ({ setSearchBody }: IProps) => {
  const [keyword, setSerchKeyword] = React.useState<string>("");
  const [regex, setRegex] = React.useState<boolean>(false);

  useEffect(() => {
    console.log("set search body", keyword, regex);
    setSearchBody({
      keyword,
      config: {
        regex,
      },
    });
  }, [keyword, regex]);

  return (
    <div className="fixed w-full flex items-center h-12">
      <Input
        className="h-full focus-visible:ring-transparent focus-visible:ring-offset-transparent border-none"
        placeholder="Input to search..."
        onChange={(e) => setSerchKeyword(e.target.value)}
      />
      <Toggle
        className={`
          ${keyword.length === 0 ? "opacity-0 pointer-events-none cursor-default" : ""}
          ease-in-out duration-500 transition-opacity
        `}
        onPressedChange={setRegex}
      >
        <Regex />
      </Toggle>
    </div>
  );
};

export default Header;
