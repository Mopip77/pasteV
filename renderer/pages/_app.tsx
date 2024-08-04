import React from "react";

import Header from "@/components/Header";
import "../styles/globals.css";

export default function HomePage() {
  const [message, setMessage] = React.useState({});

  React.useEffect(() => {
    window.ipc.on("message", (message) => {
      setMessage(message);
    });
  }, []);

  return (
    <>
      <Header></Header>
    </>
  );
}
