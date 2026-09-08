import React from "react";
import { CustomTagState } from "./stateTypes";
import { SambaDbProjectInfo } from "./SambaDbProjectInfo";

interface SambaNeonProjectInfoProps {
  node: {
    properties: {
      state?: CustomTagState;
    };
  };
  children: React.ReactNode;
}

export function SambaNeonProjectInfo(props: SambaNeonProjectInfoProps) {
  return <SambaDbProjectInfo provider="Neon" {...props} />;
}
