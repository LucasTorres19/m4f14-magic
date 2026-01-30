declare module "*.css";

// types/svg.d.ts
declare module "*.svg" {
  import type * as React from "react";
  const content: React.FC<React.SVGProps<SVGSVGElement>>;
  export default content;
}

declare module "*.svg?url" {
  const content: string;
  export default content;
}
