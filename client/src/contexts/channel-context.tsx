import { createContext, useContext, useState, ReactNode } from "react";
import type { Channel } from "@shared/schema";

interface ChannelContextType {
  selectedChannel: Channel | null;
  setSelectedChannel: (channel: Channel | null) => void;
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export function ChannelProvider({ children }: { children: ReactNode }) {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  return (
    <ChannelContext.Provider value={{ selectedChannel, setSelectedChannel }}>
      {children}
    </ChannelContext.Provider>
  );
}

export function useChannelContext() {
  const context = useContext(ChannelContext);
  if (!context) {
    throw new Error("useChannelContext must be used within a ChannelProvider");
  }
  return context;
}