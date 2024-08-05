"use client";
import { ClipboardHisotryEntity } from "@/lib/schemes";
import { useEffect, useState } from "react";

const Content = () => {
  const [histories, setHistories] = useState<ClipboardHisotryEntity[]>();

  useEffect(() => {
    setHistories(global.window.ipc.invoke("clipboard:query", { offset: 0, size: 20 }));
  }, []);

  return (
    <div>
      <ul>
        {histories.map((item) => (
          <li>{item.text}</li>
        ))}
      </ul>
    </div>
  );
};

export default Content;
