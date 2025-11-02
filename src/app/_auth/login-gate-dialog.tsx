"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { useLoginGateOpener } from "./login-gate-opener";
const formSchema = z.object({
  password: z.string().min(1),
});

export function LoginGateDialog() {
  const { isOpen, onSuccessRef, onErrorRef, close } = useLoginGateOpener();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!res.ok || !res.status.toString().startsWith("2")) {
        throw new Error("Login failed");
      }

      return true;
    },
    onMutate: () => {
      form.clearErrors();
    },
    onSuccess: () => {
      onSuccessRef.current?.();
      toast.success("Pase usted!");
      close();
    },
    onError: () => {
      form.setError("password", {
        type: "server",
        message: "Me mentiste? Cagón!",
      });
    },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    mutation.mutate(data);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          form.setValue("password", "");
          onErrorRef.current?.();
          close();
        }
      }}
    >
      <DialogContent
        overlayClassName="bg-black/100"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="sm:max-w-[425px]"
      >
        <Form {...form}>
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <DialogHeader>
              <DialogTitle>Momento wachin</DialogTitle>
              <DialogDescription>
                Te haces el crack? que podes hacer lo que se te cante?
                <br />
                NO EN MI PRESENCIA
              </DialogDescription>
            </DialogHeader>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dale turro pone la password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Contraseña"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={mutation.isPending}>
                  Me asusté
                </Button>
              </DialogClose>
              <Button type="submit" disabled={mutation.isPending}>
                Me atrapaste es magic
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
