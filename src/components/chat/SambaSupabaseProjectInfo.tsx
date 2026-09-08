import React from "react";
import { CustomTagState } from "./stateTypes";
import { SambaDbProjectInfo } from "./SambaDbProjectInfo";

interface SambaSupabaseProjectInfoProps {
  node: {
    properties: {
      state?: CustomTagState;
    };
  };
  children: React.ReactNode;
}

export function SambaSupabaseProjectInfo(props: SambaSupabaseProjectInfoProps) {
  return <SambaDbProjectInfo provider="Supabase" {...props} />;
}
