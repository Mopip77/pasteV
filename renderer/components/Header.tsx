import React from "react";
import { Input } from "./ui/input";

interface IProps {
  setSerchKeyword: (keyword: string) => void;
}

const Header = ({setSerchKeyword} : IProps) => {
  return (
    <div className="fixed w-full h-12">
      <Input
        className="h-full focus-visible:ring-transparent focus-visible:ring-offset-transparent border-none"
        placeholder="Input to search..."
        onChange={(e) => setSerchKeyword(e.target.value)}
      />
    </div>
  );
};

export default Header;
