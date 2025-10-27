import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ReactNode } from "react";
import { History } from "lucide-react";
// TODO: when opening settings this toolbar should open
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Sheet>
        <SheetContent hideClose side="bottom" className="gap-0 px-2 py-4">
          <SheetHeader className="p-0">
            <SheetTitle hidden>Bottom Toolbar</SheetTitle>
            <SheetDescription hidden>
              Bottom toolbar with some buttons :D
            </SheetDescription>
          </SheetHeader>
          <div className="flex justify-center gap-2">
            <Button size="lg">
              <History />
              HISTORY
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
