"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type {
  CreateTaskInput,
  KanbanBoard,
  KanbanColumn,
  Task,
  UpdateTaskInput,
} from "@/modules/workstation/types";
import { ArrowLeft, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { ColumnDialog } from "./column-dialog";
import { TaskCard } from "./task-card";
import { TaskDialog } from "./task-dialog";
import { TaskPreviewDialog } from "./task-preview-dialog";

interface KanbanBoardViewProps {
  board: KanbanBoard;
  columns: KanbanColumn[];
  tasks: Task[];
  onBack: () => void;
  onCreateColumn: (data: {
    name: string;
    color: string;
  }) => Promise<KanbanColumn>;
  onUpdateColumn: (
    columnId: string,
    data: { name?: string; color?: string }
  ) => Promise<KanbanColumn>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onCreateTask: (data: CreateTaskInput) => Promise<Task>;
  onUpdateTask: (taskId: string, data: UpdateTaskInput) => Promise<Task>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onMoveTask: (input: {
    taskId: string;
    targetColumnId: string;
    targetOrder: number;
  }) => Promise<void>;
  onStartPomodoro?: (taskId: string) => void;
}

interface DragState {
  taskId: string;
  sourceColumnId: string;
  sourceOrder: number;
}

export function KanbanBoardView({
  board,
  columns,
  tasks,
  onBack,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onMoveTask,
  onStartPomodoro,
}: KanbanBoardViewProps) {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskPreviewOpen, setTaskPreviewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<KanbanColumn | null>(
    null
  );
  const [deleteColumnDialog, setDeleteColumnDialog] =
    useState<KanbanColumn | null>(null);
  const [deleteTaskDialog, setDeleteTaskDialog] = useState<Task | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    columnId: string;
    order: number;
  } | null>(null);
  const dragTaskRef = useRef<HTMLDivElement | null>(null);

  // Get tasks for a column, sorted by order
  const getColumnTasks = useCallback(
    (columnId: string) => {
      return tasks
        .filter((t) => t.columnId === columnId)
        .sort((a, b) => a.order - b.order);
    },
    [tasks]
  );

  // Handle drag start
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);

    setDragState({
      taskId: task.id,
      sourceColumnId: task.columnId,
      sourceOrder: task.order,
    });

    // Add a slight delay to show dragging state
    setTimeout(() => {
      if (dragTaskRef.current) {
        dragTaskRef.current.classList.add("opacity-50");
      }
    }, 0);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDragState(null);
    setDropTarget(null);
    if (dragTaskRef.current) {
      dragTaskRef.current.classList.remove("opacity-50");
    }
  };

  // Handle drag over column
  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    columnId: string,
    order: number
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (!dragState || dragState.taskId === "") return;

    // Update drop target
    if (dropTarget?.columnId !== columnId || dropTarget?.order !== order) {
      setDropTarget({ columnId, order });
    }
  };

  // Handle drop
  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    columnId: string,
    order: number
  ) => {
    e.preventDefault();

    if (!dragState) return;

    // Don't do anything if dropped in same position
    if (
      dragState.sourceColumnId === columnId &&
      dragState.sourceOrder === order
    ) {
      handleDragEnd();
      return;
    }

    try {
      await onMoveTask({
        taskId: dragState.taskId,
        targetColumnId: columnId,
        targetOrder: order,
      });
    } catch (error) {
      console.error("Failed to move task:", error);
    }

    handleDragEnd();
  };

  // Open task dialog for creating
  const openCreateTaskDialog = (columnId: string) => {
    setSelectedTask(null);
    setSelectedColumnId(columnId);
    setTaskDialogOpen(true);
  };

  // Open task dialog for editing
  const openEditTaskDialog = (task: Task) => {
    setSelectedTask(task);
    setSelectedColumnId(task.columnId);
    setTaskPreviewOpen(false);
    setTaskDialogOpen(true);
  };

  // Open task preview dialog
  const openTaskPreview = (task: Task) => {
    setSelectedTask(task);
    setSelectedColumnId(task.columnId);
    setTaskPreviewOpen(true);
  };

  // Handle save task
  const handleSaveTask = async (data: CreateTaskInput | UpdateTaskInput) => {
    if (selectedTask) {
      await onUpdateTask(selectedTask.id, data as UpdateTaskInput);
    } else {
      await onCreateTask(data as CreateTaskInput);
    }
  };

  // Handle delete task
  const handleDeleteTask = async () => {
    if (selectedTask) {
      await onDeleteTask(selectedTask.id);
      setTaskDialogOpen(false);
      setTaskPreviewOpen(false);
    }
  };

  // Handle confirm delete task from card
  const handleConfirmDeleteTask = async () => {
    if (deleteTaskDialog) {
      await onDeleteTask(deleteTaskDialog.id);
      setDeleteTaskDialog(null);
    }
  };

  // Get selected column for preview
  const getSelectedColumn = () => {
    if (selectedColumnId) {
      return columns.find((c) => c.id === selectedColumnId);
    }
    return null;
  };

  // Open column dialog
  const openColumnDialog = (column?: KanbanColumn) => {
    setSelectedColumn(column || null);
    setColumnDialogOpen(true);
  };

  // Handle save column
  const handleSaveColumn = async (data: { name: string; color: string }) => {
    if (selectedColumn) {
      await onUpdateColumn(selectedColumn.id, data);
    } else {
      await onCreateColumn(data);
    }
  };

  // Handle delete column from dialog
  const handleDeleteColumn = async () => {
    if (selectedColumn) {
      await onDeleteColumn(selectedColumn.id);
    }
  };

  // Handle confirm delete column
  const handleConfirmDeleteColumn = async () => {
    if (deleteColumnDialog) {
      await onDeleteColumn(deleteColumnDialog.id);
      setDeleteColumnDialog(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg"
              style={{ backgroundColor: board.color }}
            />
            <div>
              <h1 className="text-xl font-bold">{board.name}</h1>
              {board.description && (
                <p className="text-sm text-muted-foreground">
                  {board.description}
                </p>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => openColumnDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Coluna
        </Button>
      </div>

      {/* Kanban Board */}
      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="flex gap-4 pb-4 min-h-[calc(100vh-240px)]">
          {columns.map((column) => {
            const columnTasks = getColumnTasks(column.id);

            return (
              <div
                key={column.id}
                className="shrink-0 w-72"
                onDragOver={(e) =>
                  handleDragOver(e, column.id, columnTasks.length)
                }
                onDrop={(e) => handleDrop(e, column.id, columnTasks.length)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <h3 className="font-medium">{column.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      ({columnTasks.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openCreateTaskDialog(column.id)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openColumnDialog(column)}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteColumnDialog(column)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Column Content */}
                <div className="bg-muted/50 rounded-lg p-2 min-h-[200px] space-y-2">
                  {columnTasks.map((task, index) => (
                    <div
                      key={task.id}
                      ref={
                        dragState?.taskId === task.id ? dragTaskRef : undefined
                      }
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, column.id, index)}
                      onDrop={(e) => handleDrop(e, column.id, index)}
                      className={`transition-transform ${
                        dropTarget?.columnId === column.id &&
                        dropTarget?.order === index
                          ? "translate-y-2"
                          : ""
                      }`}
                    >
                      <TaskCard
                        task={task}
                        isDragging={dragState?.taskId === task.id}
                        onClick={() => openTaskPreview(task)}
                        onEdit={() => openEditTaskDialog(task)}
                        onDelete={() => setDeleteTaskDialog(task)}
                        onStartPomodoro={
                          onStartPomodoro
                            ? () => onStartPomodoro(task.id)
                            : undefined
                        }
                      />
                    </div>
                  ))}

                  {/* Drop zone at the end */}
                  {columnTasks.length === 0 && (
                    <div
                      className={`h-20 border-2 border-dashed rounded-lg flex items-center justify-center text-sm text-muted-foreground transition-colors ${
                        dropTarget?.columnId === column.id
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/20"
                      }`}
                    >
                      {dropTarget?.columnId === column.id
                        ? "Solte aqui"
                        : "Arraste tarefas aqui"}
                    </div>
                  )}

                  {/* Add task button */}
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => openCreateTaskDialog(column.id)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar tarefa
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Add column placeholder */}
          <div className="shrink-0 w-72">
            <Button
              variant="ghost"
              className="w-full h-12 border-2 border-dashed border-muted-foreground/20 text-muted-foreground"
              onClick={() => openColumnDialog()}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Coluna
            </Button>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedTask}
        columns={columns}
        boardId={board.id}
        onSave={handleSaveTask}
        onDelete={selectedTask ? handleDeleteTask : undefined}
        onStartPomodoro={onStartPomodoro}
      />

      {/* Column Dialog */}
      <ColumnDialog
        open={columnDialogOpen}
        onOpenChange={setColumnDialogOpen}
        column={selectedColumn}
        boardId={board.id}
        onSave={handleSaveColumn}
        onDelete={selectedColumn ? handleDeleteColumn : undefined}
      />

      {/* Delete Column Confirmation */}
      <AlertDialog
        open={!!deleteColumnDialog}
        onOpenChange={(open) => !open && setDeleteColumnDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Coluna</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a coluna &quot;
              {deleteColumnDialog?.name}&quot;? Todas as tarefas nesta coluna
              serão excluídas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteColumn}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Task Confirmation */}
      <AlertDialog
        open={!!deleteTaskDialog}
        onOpenChange={(open) => !open && setDeleteTaskDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tarefa &quot;
              {deleteTaskDialog?.title}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Preview Dialog */}
      <TaskPreviewDialog
        open={taskPreviewOpen}
        onOpenChange={setTaskPreviewOpen}
        task={selectedTask}
        column={getSelectedColumn()}
        onEdit={() => {
          if (selectedTask) {
            openEditTaskDialog(selectedTask);
          }
        }}
        onDelete={() => {
          setTaskPreviewOpen(false);
          if (selectedTask) {
            setDeleteTaskDialog(selectedTask);
          }
        }}
        onStartPomodoro={(taskId) => {
          setTaskPreviewOpen(false);
          onStartPomodoro?.(taskId);
        }}
      />
    </div>
  );
}
