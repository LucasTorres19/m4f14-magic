import { arraySwap, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type CSSProperties, type ReactNode } from "react";

interface SortablePlayerCardProps {
  id: string;
  children: ReactNode;
}

export function SortablePlayerCard({ id, children }: SortablePlayerCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    getNewIndex: ({ id, items, activeIndex, overIndex }) => {
      if (activeIndex < 0 || overIndex < 0) return items.indexOf(id);
      return arraySwap(items, activeIndex, overIndex).indexOf(id);
    },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0 : 1,
    touchAction: "none",
    willChange: "transform",
  };

  return (
    <div
      ref={setNodeRef}
      data-player-id={id}
      style={style}
      {...attributes}
      {...listeners}
      className="h-full w-full touch-none select-none"
    >
      {children}
    </div>
  );
}
