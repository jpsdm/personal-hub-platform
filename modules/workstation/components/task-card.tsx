"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  formatDuration,
  getPriorityBadgeVariant,
} from "@/modules/workstation/lib/utils";
import type { Task } from "@/modules/workstation/types";
import { PRIORITY_LABELS } from "@/modules/workstation/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  Clock,
  ExternalLink,
  GripVertical,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { getDescriptionPreview } from "./editor-js";

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStartPomodoro?: () => void;
}

export function TaskCard({
  task,
  isDragging,
  onClick,
  onEdit,
  onDelete,
  onStartPomodoro,
}: TaskCardProps) {
  const descriptionPreview = getDescriptionPreview(task.description, 80);

  return (
    <Card
      className={`p-3 cursor-pointer hover:shadow-md transition-all group ${
        isDragging ? "opacity-50 rotate-3 shadow-lg" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <Link
              href={`/workstation/task/${task.id}`}
              className="text-xs font-mono text-muted-foreground hover:text-primary hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {task.code}
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Badge
              variant={getPriorityBadgeVariant(task.priority)}
              className="text-xs"
            >
              {PRIORITY_LABELS[task.priority]}
            </Badge>
          </div>
          <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
          {descriptionPreview && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {descriptionPreview}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {format(new Date(task.dueDate), "dd/MM", { locale: ptBR })}
                </span>
              </div>
            )}
            {task.totalTimeSpent && task.totalTimeSpent > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatDuration(task.totalTimeSpent)}</span>
              </div>
            )}
          </div>

          {/* Action buttons - show on hover */}
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onStartPomodoro && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartPomodoro();
                }}
                title="Iniciar Pomodoro"
              >
                <Play className="w-3.5 h-3.5" />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                title="Editar"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="Excluir"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
