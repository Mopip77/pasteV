import React from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";

import "../styles/globals.css";

export default function HomePage() {
  const [message, setMessage] = React.useState({});

  React.useEffect(() => {
    window.ipc.on("message", (message) => {
      setMessage(message);
    });
  }, []);

  return (
    <React.Fragment>
      <Head>
        <title>Home - Nextron (basic-lang-javascript)</title>
      </Head>
      <div>
        <p>
          ⚡ Electron + Next.js ⚡ - <Link href="/next">Go to next page</Link>
        </p>
        <Image
          src="/images/logo.png"
          alt="Logo image"
          width={256}
          height={256}
        />
      </div>
      <div>
        <button
          onClick={() => {
            window.ipc.send("message", "Hello");
          }}
        >
          Test IPC
        </button>
        <div>
          <div className="flex gap-9 border-b-2 border-b-gray-500">
            <div>text</div>
            <div>{message.text}</div>
          </div>
          <div className="flex gap-9 border-b-2 border-b-gray-500">
            <div>html</div>
            <div>{message.html}</div>
          </div>
          <div className="flex gap-9 border-b-2 border-b-gray-500">
            <div>rtf</div>
            <div>{message.rtf}</div>
          </div>
          <div className="flex gap-9 border-b-2 border-b-gray-500">
            <div>url</div>
            <div>{message.url}</div>
          </div>
          <div className="flex gap-9 border-b-2 border-b-gray-500">
            <div>file</div>
            <div>{message.file}</div>
          </div>
          <div className="flex gap-9 border-b-2 border-b-gray-500">
            <div>img</div>
            <div>{message.img?.isEmpty().toString()}</div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
