"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/modules/workstation/lib/utils";
import type {
  CreateTaskInput,
  KanbanColumn,
  Task,
  TaskPriority,
  UpdateTaskInput,
} from "@/modules/workstation/types";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/modules/workstation/types";
import type { OutputData } from "@editorjs/editorjs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  EditorJSComponent,
  parseDescription,
  stringifyDescription,
} from "./editor-js";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  columns?: KanbanColumn[];
  columnId?: string;
  boardId?: string;
  onSave: (data: CreateTaskInput | UpdateTaskInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  onStartPomodoro?: (taskId: string) => void;
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  columns,
  columnId: propColumnId,
  boardId,
  onSave,
  onDelete,
  onStartPomodoro,
}: TaskDialogProps) {
  const initialColumnId =
    task?.columnId || propColumnId || columns?.[0]?.id || "";

  const [formData, setFormData] = useState({
    title: task?.title || "",
    priority: task?.priority || ("MEDIUM" as TaskPriority),
    columnId: initialColumnId,
    dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
  });
  const [description, setDescription] = useState<OutputData | undefined>(
    parseDescription(task?.description)
  );
  const [submitting, setSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const isEditing = !!task;

  // Reset form when dialog opens with new task or task changes
  useEffect(() => {
    if (open) {
      const newColumnId =
        task?.columnId || propColumnId || columns?.[0]?.id || "";
      setFormData({
        title: task?.title || "",
        priority: task?.priority || "MEDIUM",
        columnId: newColumnId,
        dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
      });
      setDescription(parseDescription(task?.description));
    }
  }, [
    open,
    task?.id,
    task?.title,
    task?.priority,
    task?.columnId,
    task?.dueDate,
    task?.description,
    propColumnId,
    columns,
  ]);

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.columnId) return;

    setSubmitting(true);
    try {
      const descriptionString = stringifyDescription(description);

      if (isEditing) {
        await onSave({
          title: formData.title,
          description: descriptionString || undefined,
          priority: formData.priority,
          columnId: formData.columnId,
          dueDate: formData.dueDate,
        });
      } else {
        await onSave({
          boardId: boardId!,
          columnId: formData.columnId,
          title: formData.title,
          description: descriptionString || undefined,
          priority: formData.priority,
          dueDate: formData.dueDate,
        });
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setSubmitting(true);
    try {
      await onDelete();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? (
              <span className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">
                  {task.code}
                </span>
                Editar Tarefa
              </span>
            ) : (
              "Nova Tarefa"
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="O que precisa ser feito?"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <div className="min-h-[200px] border rounded-md overflow-hidden">
              {open && (
                <EditorJSComponent
                  key={task?.id || "new"}
                  data={description}
                  onChange={setDescription}
                  placeholder="Adicione detalhes da tarefa..."
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {columns && columns.length > 0 && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.columnId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, columnId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: column.color }}
                          />
                          {column.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: value as TaskPriority,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map(
                    (priority) => (
                      <SelectItem key={priority} value={priority}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: PRIORITY_COLORS[priority],
                            }}
                          />
                          {PRIORITY_LABELS[priority]}
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data de Entrega</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.dueDate
                    ? format(formData.dueDate, "PPP", { locale: ptBR })
                    : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.dueDate}
                  onSelect={(date) => {
                    setFormData((prev) => ({ ...prev, dueDate: date }));
                    setCalendarOpen(false);
                  }}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            {formData.dueDate && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, dueDate: undefined }))
                }
              >
                Remover data
              </Button>
            )}
          </div>

          {isEditing &&
            task.totalTimeSpent !== undefined &&
            task.totalTimeSpent > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Tempo dedicado:{" "}
                  <span className="font-medium">
                    {formatDuration(task.totalTimeSpent)}
                  </span>
                </span>
              </div>
            )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          {isEditing && (
            <>
              {onDelete && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={submitting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )}
            </>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
