import type React from "react";
import type { ReactNode } from "react";
import { ScanQrCode } from "lucide-react";
import { SambaCard, SambaCardHeader, SambaBadge } from "./SambaCardPrimitives";

interface SambaWebCrawlProps {
  children?: ReactNode;
  node?: any;
}

export const SambaWebCrawl: React.FC<SambaWebCrawlProps> = ({
  children,
  node: _node,
}) => {
  return (
    <SambaCard accentColor="blue">
      <SambaCardHeader icon={<ScanQrCode size={15} />} accentColor="blue">
        <SambaBadge color="blue">Web Crawl</SambaBadge>
      </SambaCardHeader>
      {children && (
        <div className="px-3 pb-2 text-sm italic text-muted-foreground">
          {children}
        </div>
      )}
    </SambaCard>
  );
};
