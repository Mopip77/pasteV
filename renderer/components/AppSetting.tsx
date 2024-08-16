import React, { useEffect } from "react";
import log from "electron-log/renderer";
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
import dynamic from "next/dynamic";

const SettingsPage = () => {
  let appSettingConfig = useSelector(
    (state: RootState) => state.appSettingConfig
  );
  const dispatch = useDispatch();

  const settingSechema = z.object({
    aiTagEnable: z.boolean(),
    aiTagByImage: z.boolean(),
    openaiConfig: z.object({
      apiHost: z.string(),
      apiKey: z.string(),
      model: z.string(),
    }),
  });

  const form = useForm<z.infer<typeof settingSechema>>({
    resolver: zodResolver(settingSechema),
    defaultValues: {
      aiTagEnable: appSettingConfig.aiTagEnable,
      aiTagByImage: appSettingConfig.aiTagByImage,
      openaiConfig: appSettingConfig.openaiConfig,
    },
  });

  const onSubmit = (data: any) => {
    log.info("onSubmit", data);
    dispatch(updateAppSettingConfig(data));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="aiTagEnable"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">AI 生成标签</FormLabel>
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
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};

export default SettingsPage;
