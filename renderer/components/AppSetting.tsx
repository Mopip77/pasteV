import React, { KeyboardEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/stores/store";
import { updateAppSettingConfig } from "@/stores/appSettingConfigSlice";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useRouter } from "next/router";
import { Toaster } from "./ui/toaster";
import { toast } from "./ui/use-toast";
import { cn } from "@/lib/utils";
import { Check, Disc2 } from "lucide-react";
import { Toggle } from "./ui/toggle";

const SettingsPage = () => {
  let appSettingConfig = useSelector(
    (state: RootState) => state.appSettingConfig
  );
  const dispatch = useDispatch();
  const router = useRouter();

  const [recordPressed, setRecordPressed] = React.useState(false);
  const [recordingShortcut, setRecordingShortcut] = React.useState("");

  const settingSechema = z
    .object({
      appWindowToggleShortcut: z.string().min(1, { message: "不能为空" }),
      aiTagEnable: z.boolean(),
      imageInputType: z.string(),
      openaiConfig: z.object({
        apiHost: z.string(),
        apiKey: z.string(),
        model: z.string(),
      }),
    })
    .superRefine((data, ctx) => {
      if (data.aiTagEnable) {
        if (!data.openaiConfig.apiHost) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "apiHost is required",
            path: ["openaiConfig", "apiHost"],
          });
        }
        if (!data.openaiConfig.apiKey) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "apiKey is required",
            path: ["openaiConfig", "apiKey"],
          });
        }
        if (!data.openaiConfig.model) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "model is required",
            path: ["openaiConfig", "model"],
          });
        }
      }
    });

  const form = useForm<z.infer<typeof settingSechema>>({
    resolver: zodResolver(settingSechema),
    defaultValues: {
      appWindowToggleShortcut: appSettingConfig.appWindowToggleShortcut,
      aiTagEnable: appSettingConfig.aiTagEnable,
      imageInputType: appSettingConfig.imageInputType,
      openaiConfig: appSettingConfig.openaiConfig,
    },
  });

  const onSubmit = (data: any) => {
    dispatch(updateAppSettingConfig(data));
    toast({
      title: "保存成功",
      duration: 1000,
      className: cn(
        "top-0 right-0 flex fixed md:max-w-[420px] md:top-4 md:right-4"
      ),
    });
  };

  const onCancel = () => {
    router.back();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!recordPressed) {
      return;
    }

    e.stopPropagation();
    e.preventDefault();

    let keys = [];
    if (e.metaKey || e.ctrlKey) {
      keys.push("CommandOrControl");
    }
    if (e.shiftKey) {
      keys.push("Shift");
    }
    if (e.altKey) {
      keys.push("Alt");
    }
    if (e.key.length === 1) {
      keys.push(e.key.toUpperCase());
      form.setValue("appWindowToggleShortcut", keys.join("+"));
    }
  };

  const handleRecordShortcuts = (pressed) => {
    setRecordPressed(pressed);
    if (pressed) {
      setRecordingShortcut(form.getValues("appWindowToggleShortcut"));
      form.setValue("appWindowToggleShortcut", "请输入快捷键");
    } else {
      form.setValue("appWindowToggleShortcut", recordingShortcut);
    }
  };

  const handleSaveShortcuts = () => {
    setRecordPressed(false);
    setRecordingShortcut(form.getValues("appWindowToggleShortcut"));
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-3xl mx-auto flex flex-col space-y-4 my-4 h-[75vh] overflow-y-scroll scrollbar-none"
      >
        <h3 className="text-2xl font-bold">应用设置</h3>
        <FormField
          control={form.control}
          name="appWindowToggleShortcut"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">展示/隐藏窗口快捷键</FormLabel>
              </div>
              <div className="flex w-1/2 gap-2">
                <Input
                  className="w-1/2 flex-grow bg-gray-300"
                  disabled
                  {...field}
                />
                <Button
                  className={`px-2 transition-opacity ease-linear animate-in slide-in-from-right-4 duration-500 ${
                    recordPressed ? "opacity-100" : "hidden opacity-0"
                  }`}
                  type="button"
                  variant="outline"
                  aria-label="Save Shortcuts"
                  onClick={handleSaveShortcuts}
                >
                  <Check size={24} className="text-primary" strokeWidth={3} />
                </Button>
                <Toggle
                  className="px-2"
                  variant="outline"
                  aria-label="Record Shortcuts"
                  onKeyDown={handleKeyDown}
                  pressed={recordPressed}
                  onPressedChange={handleRecordShortcuts}
                >
                  <Disc2 size={24} className="text-primary" strokeWidth={3} />
                </Toggle>
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="aiTagEnable"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">AI 生成图片标签</FormLabel>
                <FormDescription>
                  通过 AI 生成图片标签，便于搜索和分类
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        {form.watch("aiTagEnable") && (
          <FormField
            control={form.control}
            name="imageInputType"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">图片输入模式</FormLabel>
                  <FormDescription>
                    <span>喂给 AI 的数据是图片还是 OCR 文本</span>
                    <span className="text-gray-400">
                      （
                      {field.value === "image"
                        ? " 需要使用支持图片的 gpt 模型 "
                        : " 图片如果文字很少，会导致 AI 识别效果差 "}
                      ）
                    </span>
                  </FormDescription>
                </div>
                <FormControl>
                  <RadioGroup
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="image" />
                      </FormControl>
                      <FormLabel className="font-normal">图片</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="text" />
                      </FormControl>
                      <FormLabel className="font-normal">ocr 文本</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />
        )}
        {form.watch("aiTagEnable") && (
          <>
            <FormField
              control={form.control}
              name="openaiConfig.apiHost"
              render={({ field }) => (
                <FormItem className="p-2">
                  <FormLabel>OpenAI API Host</FormLabel>
                  <Input {...field} />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="openaiConfig.apiKey"
              render={({ field }) => (
                <FormItem className="p-2">
                  <FormLabel>OpenAI API Key</FormLabel>
                  <Input {...field} />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="openaiConfig.model"
              render={({ field }) => (
                <FormItem className="p-2">
                  <FormLabel>OpenAI Model</FormLabel>
                  <Input {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        <div className="w-full max-w-3xl fixed bottom-20 h-4">
          <div className="w-full flex justify-around">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </div>
        </div>
      </form>
      <Toaster />
    </Form>
  );
};

export default SettingsPage;
