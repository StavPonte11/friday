"use client";

import { useWorkspace } from "@/hooks/use-workspace";
import { Check, ChevronsUpDown, PlusCircle, Building } from "lucide-react";
import { cn } from "@/lib/utils";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface WorkspaceSwitcherProps {
  isOpen: boolean;
}

export function WorkspaceSwitcher({ isOpen }: WorkspaceSwitcherProps) {
  const { workspace, workspaces, isLoading } = useWorkspace();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (isLoading || !workspaces) {
    return <div className="h-10 animate-pulse bg-muted rounded-md w-full" />;
  }

  // Current selected workspace from the array
  const selected = workspaces.find((w) => w.id === workspace?.id);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a workspace"
          className={cn(
            "w-full justify-between px-2",
            !isOpen && "justify-center px-0 w-10 border-transparent shadow-none hover:bg-accent"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {selected?.logoUrl ? (
                <img src={selected.logoUrl} className="w-5 h-5 rounded" alt="" />
            ) : (
                <Building className={cn("w-5 h-5 text-muted-foreground transition-all")} />
            )}
            
            {isOpen && (
              <span className="truncate flex-1 text-left font-medium">
                {selected?.name ?? "Select Workspace"}
              </span>
            )}
          </div>
          {isOpen && <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandList>
            <CommandInput placeholder="Search workspace..." />
            <CommandEmpty>No workspace found.</CommandEmpty>
            <CommandGroup heading="Your Workspaces">
              {workspaces.map((w) => (
                <CommandItem
                  key={w.id}
                  onSelect={() => {
                    setOpen(false);
                    // Update cookie and reload so the layout gets the new workspace layout wrapper context
                    document.cookie = `friday_workspace_id=${w.id}; path=/; max-age=31536000`;
                    window.location.reload();
                  }}
                  className="text-sm"
                >
                  <div className="flex items-center gap-2 flex-1 truncate">
                    {w.logoUrl ? (
                        <img src={w.logoUrl} className="w-4 h-4 rounded" alt="" />
                    ) : (
                        <Building className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="truncate">{w.name}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selected?.id === w.id
                        ? "opacity-100 text-primary"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <CommandSeparator />
          <CommandList>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  router.push("/en/onboarding"); // Or wherever workspace create lives
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                Create Workspace
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
