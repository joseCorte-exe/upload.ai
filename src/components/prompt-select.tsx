import { http } from "@/lib/axios";
import { SelectProps } from "@radix-ui/react-select";
import { useEffect, useState } from "react";
import * as Select from "./ui/select";

type PromptType = {
  id: string,
  title: string,
  template: string
}

export function PromptSelect({ ...rest }: SelectProps) {
  const [prompts, setPrompts] = useState<PromptType[] | null>(null)

  const { onValueChange } = rest

  useEffect(() => {
    http.get('/prompts').then((response) => {
      setPrompts(response.data)
    })
  }, [])

  const handlePromptSelected = (promptId: string) => {
    const selected = prompts?.find(p => p.id === promptId)

    if (!selected) return

    return onValueChange && onValueChange(selected.template)
  }

  return (
    <Select.Select {...rest} onValueChange={handlePromptSelected}>
      <Select.SelectTrigger>
        <Select.SelectValue placeholder="Selecione um prompt" />
        <Select.SelectContent>
          {prompts?.map(p => (
            <Select.SelectItem key={p.id} value={p.id}>{p.title}</Select.SelectItem>
          ))}
        </Select.SelectContent>
      </Select.SelectTrigger>
    </Select.Select>
  )
}