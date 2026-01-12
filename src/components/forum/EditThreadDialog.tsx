import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface EditThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thread: {
    id: string;
    title: string;
    body: string;
  };
}

export function EditThreadDialog({ open, onOpenChange, thread }: EditThreadDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(thread.title);
  const [body, setBody] = useState(thread.body);

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !body.trim()) {
        throw new Error("Title and body are required");
      }

      const { error } = await supabase
        .from("threads")
        .update({ title: title.trim(), body: body.trim() })
        .eq("id", thread.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      queryClient.invalidateQueries({ queryKey: ["thread", thread.id] });
      toast.success("Post updated!");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-body">Body</Label>
            <Textarea
              id="edit-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Post content"
              rows={6}
              className="resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => editMutation.mutate()}
              disabled={editMutation.isPending || !title.trim() || !body.trim()}
            >
              {editMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
