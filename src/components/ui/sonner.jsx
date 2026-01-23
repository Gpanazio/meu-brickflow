import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner";

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-black group-[.toaster]:text-white group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-lg group-[.toaster]:font-mono group-[.toaster]:uppercase group-[.toaster]:tracking-wider group-[.toaster]:rounded-none",
          description: "group-[.toast]:text-zinc-500",
          actionButton: "group-[.toast]:bg-zinc-100 group-[.toast]:text-black",
          cancelButton: "group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-400",
          error: "group-[.toaster]:!border-red-900 group-[.toaster]:!text-red-500",
          success: "group-[.toaster]:!border-green-900 group-[.toaster]:!text-green-500",
          warning: "group-[.toaster]:!border-yellow-900 group-[.toaster]:!text-yellow-500",
          info: "group-[.toaster]:!border-blue-900 group-[.toaster]:!text-blue-500",
        },
      }}
      {...props} />
  );
}

export { Toaster }
