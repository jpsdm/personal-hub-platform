"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";

interface SearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string; color?: string }[];
  placeholder?: string;
  emptyText?: string;
  createText?: string;
  onCreate?: (
    name: string,
    color?: string
  ) => Promise<{ id: string; name: string } | null>;
  className?: string;
  disabled?: boolean;
  showColorPicker?: boolean;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Selecione...",
  emptyText = "Nenhum resultado encontrado",
  createText = "Criar novo",
  onCreate,
  className,
  disabled = false,
  showColorPicker = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemColor, setNewItemColor] = useState("#3b82f6");
  const [creating, setCreating] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleCreate = async () => {
    if (!newItemName.trim() || !onCreate) return;

    setCreating(true);
    try {
      const result = await onCreate(
        newItemName.trim(),
        showColorPicker ? newItemColor : undefined
      );
      if (result) {
        onValueChange(result.id);
        setCreateDialogOpen(false);
        setNewItemName("");
        setNewItemColor("#3b82f6");
        setOpen(false);
      }
    } catch (error) {
      console.error("Error creating item:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal",
              !value && "text-muted-foreground",
              className
            )}
            disabled={disabled}
          >
            <div className="flex items-center gap-2 truncate">
              {selectedOption?.color && (
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: selectedOption.color }}
                />
              )}
              <span className="truncate">
                {selectedOption?.label || placeholder}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      {option.color && (
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: option.color }}
                        />
                      )}
                      <span className="truncate">{option.label}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {onCreate && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setCreateDialogOpen(true);
                        setNewItemName(search);
                      }}
                      className="text-primary"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span>{createText}</span>
                      {search && (
                        <span className="ml-1 text-muted-foreground">
                          "{search}"
                        </span>
                      )}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{createText}</DialogTitle>
            <DialogDescription>
              Digite o nome para criar um novo item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Digite o nome..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !creating && !showColorPicker) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
            </div>
            {showColorPicker && (
              <div className="space-y-2">
                <Label htmlFor="color">Cor</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={newItemColor}
                    onChange={(e) => setNewItemColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={newItemColor}
                    onChange={(e) => setNewItemColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setNewItemName("");
                setNewItemColor("#3b82f6");
              }}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newItemName.trim()}
            >
              {creating ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
