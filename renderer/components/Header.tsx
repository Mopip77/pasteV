import React, { useEffect } from "react";
import { Input } from "./ui/input";
import { Toggle } from "./ui/toggle";
import { Regex } from "lucide-react";
import { SearchContext } from "@/types/types";

interface IProps {
  setSearchBody: (ctx: SearchContext) => void;
}

const Header = ({ setSearchBody }: IProps) => {
  const [keyword, setSerchKeyword] = React.useState<string>("");
  const [regex, setRegex] = React.useState<boolean>(false);

  useEffect(() => {
    setSearchBody({
      keyword,
      regex,
    });
  }, [keyword, regex]);

  return (
    <div className="fixed w-full flex items-center h-12">
      <Input
        className="h-full focus-visible:ring-transparent focus-visible:ring-offset-transparent border-none"
        placeholder="Input to search..."
        onChange={(e) => setSerchKeyword(e.target.value)}
      />
      <Toggle onPressedChange={setRegex}>
        <Regex />
      </Toggle>
    </div>
  );
};

export default Header;
