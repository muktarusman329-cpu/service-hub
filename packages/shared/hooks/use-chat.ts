import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { liveApiClient } from "../live-api-client";

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => liveApiClient.getConversations(),
  });
}

export function useMessages(conversationId: string, before?: string) {
  return useQuery({
    queryKey: ["messages", conversationId, before],
    queryFn: () => liveApiClient.getMessages(conversationId, before),
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, data }: { conversationId: string; data: Parameters<typeof liveApiClient.sendMessage>[1] }) =>
      liveApiClient.sendMessage(conversationId, data),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
